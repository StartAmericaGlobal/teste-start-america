/* ============================================================
   Globo 3D interativo — Start América
   Adaptado (sem React/JSX) do componente "Globe — Originkit".
   Usa Three.js + d3-geo via CDN (ES modules) para desenhar um globo
   pontilhado a partir dos contornos reais dos continentes.
   ============================================================ */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { geoEquirectangular, geoPath } from 'https://cdn.jsdelivr.net/npm/d3-geo@3/+esm';

var LAND_GEOJSON_URL = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/50m/physical/ne_50m_land.json';
var landFeaturesCache = null;
var landFeaturesPromise = null;

function loadLandFeatures() {
  if (landFeaturesCache) return Promise.resolve(landFeaturesCache);
  if (!landFeaturesPromise) {
    landFeaturesPromise = fetch(LAND_GEOJSON_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('Falha ao carregar dados do mapa');
        return res.json();
      })
      .then(function (data) {
        landFeaturesCache = data;
        return data;
      });
  }
  return landFeaturesPromise;
}

function parseColorToRgba(input) {
  if (!input || input.trim() === '') return { r: 0, g: 0, b: 0, a: 0 };
  var str = input.trim();
  var hex = str.replace(/^#/, '');
  if (hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255,
      a: parseInt(hex.slice(6, 8), 16) / 255
    };
  }
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255,
      a: 1
    };
  }
  return { r: 1, g: 1, b: 1, a: 1 };
}

function mapLinear(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  var t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

function latLngToPosition(lat, lng) {
  var latRad = lat * (Math.PI / 180);
  var lngRad = lng * (Math.PI / 180);
  return {
    x: Math.cos(latRad) * Math.sin(lngRad),
    y: Math.sin(latRad),
    z: Math.cos(latRad) * Math.cos(lngRad)
  };
}

/**
 * Inicializa um globo dentro de `container`.
 * options: {
 *   speed, smoothing, dotColor, dotSize, density, scale, stopOnHover,
 *   markers: [{lat, lng}], markerColor, markerSize,
 *   direction, initialLatitude, initialLongitude,
 *   oceanColor, dragSpeed, onReady
 * }
 */
export function initGlobe(container, options) {
  options = options || {};
  var speed = options.speed != null ? options.speed : 2;
  var smoothing = options.smoothing != null ? options.smoothing : 8;
  var dotColor = options.dotColor || '#E2C98A';
  var dotSize = options.dotSize != null ? options.dotSize : 4;
  var density = options.density != null ? options.density : 7;
  var scale = options.scale != null ? options.scale : 8;
  var stopOnHover = options.stopOnHover !== false;
  var markers = options.markers || [];
  var markerColor = options.markerColor || '#ffffff';
  var markerSize = options.markerSize != null ? options.markerSize : 55;
  var direction = options.direction || 'left';
  var initialLatitude = options.initialLatitude != null ? options.initialLatitude : 12;
  var initialLongitude = options.initialLongitude != null ? options.initialLongitude : -35;
  var oceanColor = options.oceanColor || '#0000';
  var dragSpeed = options.dragSpeed != null ? options.dragSpeed : 5;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) speed = 0;

  var dotSizeMultiplier = mapLinear(Math.max(1, Math.min(10, dotSize)), 1, 10, 0.1, 0.5);
  var dotSpacing = mapLinear(Math.max(1, Math.min(10, density)), 1, 10, 24, 8);
  var scaleMultiplier = mapLinear(Math.max(1, Math.min(20, scale)), 1, 20, 0.2, 2);
  var markerRadiusMultiplier = mapLinear(Math.max(0, Math.min(100, markerSize)), 0, 100, 0.1, 2.5);
  var smoothingN = Math.max(0, Math.min(1, smoothing / 10));
  var baseRotationSpeed = speed === 0 ? 0 : mapLinear(Math.max(0, Math.min(10, speed)), 0, 10, 0, 0.9);
  var rotationSpeed = direction === 'left' ? -baseRotationSpeed : baseRotationSpeed;

  var containerWidth = container.clientWidth || 600;
  var containerHeight = container.clientHeight || 600;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, containerWidth / containerHeight, 0.1, 1000);
  var globeRadius = 1 * scaleMultiplier;
  var cameraDistance = 2.5 / scaleMultiplier;
  camera.position.set(0, 0, cameraDistance);
  camera.lookAt(0, 0, 0);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(containerWidth, containerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  var canvas = renderer.domElement;
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity 900ms ease';
  container.appendChild(canvas);

  var oceanRgba = parseColorToRgba(oceanColor);
  var dotRgba = parseColorToRgba(dotColor);

  var oceanGeometry = new THREE.SphereGeometry(globeRadius, 48, 48);
  var oceanMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(oceanColor === '#0000' ? '#000000' : oceanColor),
    transparent: true,
    opacity: oceanRgba.a
  });
  var oceanMesh = new THREE.Mesh(oceanGeometry, oceanMaterial);

  var globeGroup = new THREE.Group();
  var initialLongitudeRad = (initialLongitude * Math.PI) / 180;
  var initialLatitudeRad = (initialLatitude * Math.PI) / 180;
  globeGroup.rotation.y = initialLongitudeRad;
  globeGroup.rotation.x = initialLatitudeRad;
  globeGroup.add(oceanMesh);
  scene.add(globeGroup);

  var markerMeshes = [];
  function addMarkers() {
    if (!markers.length) return;
    var markerGeometry = new THREE.SphereGeometry(0.01 * markerRadiusMultiplier, 16, 16);
    var markerMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(markerColor) });
    markers.forEach(function (m) {
      if (typeof m.lat !== 'number' || typeof m.lng !== 'number') return;
      var pos = latLngToPosition(m.lat, m.lng);
      var mesh = new THREE.Mesh(markerGeometry, markerMaterial.clone());
      mesh.position.set(pos.x * globeRadius, pos.y * globeRadius, pos.z * globeRadius);
      globeGroup.add(mesh);
      markerMeshes.push(mesh);

      // halo pulsante ao redor de cada marcador
      var haloGeometry = new THREE.SphereGeometry(0.01 * markerRadiusMultiplier * 2.2, 16, 16);
      var haloMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(markerColor), transparent: true, opacity: 0.35 });
      var halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.position.copy(mesh.position);
      halo.userData.pulse = Math.random() * Math.PI * 2;
      globeGroup.add(halo);
      markerMeshes.push(halo);
    });
  }

  var rotation = { x: initialLongitudeRad, y: initialLatitudeRad };
  var targetRotation = { x: initialLongitudeRad, y: initialLatitudeRad };
  var velocity = { x: 0, y: 0 };
  var isDragging = false;
  var isHovering = false;
  var lastMouseX = 0, lastMouseY = 0;
  var animationFrameId = null;
  var lerpFactor = smoothingN === 0 ? 1 : mapLinear(smoothingN, 0, 1, 0.4, 0.03);
  var velocityDecay = mapLinear(smoothingN, 0, 1, 0.7, 0.96);
  var clock = new THREE.Clock();

  function render() {
    markerMeshes.forEach(function (mesh) {
      if (mesh.userData && typeof mesh.userData.pulse === 'number') {
        mesh.userData.pulse += 0.04;
        var s = 1 + Math.sin(mesh.userData.pulse) * 0.25;
        mesh.scale.setScalar(s);
      }
    });
    renderer.render(scene, camera);
  }

  function animate() {
    var threshold = 0.01;
    if (!isDragging && rotationSpeed !== 0 && (!stopOnHover || !isHovering)) {
      targetRotation.x += rotationSpeed * 0.01;
    }
    if (!isDragging && smoothingN > 0) {
      if (Math.abs(velocity.x) > threshold || Math.abs(velocity.y) > threshold) {
        targetRotation.x += velocity.x;
        targetRotation.y += velocity.y;
        targetRotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.y));
        velocity.x *= velocityDecay;
        velocity.y *= velocityDecay;
      } else {
        velocity.x = 0; velocity.y = 0;
      }
    }
    var dx = targetRotation.x - rotation.x;
    var dy = targetRotation.y - rotation.y;
    rotation.x += dx * lerpFactor;
    rotation.y += dy * lerpFactor;
    rotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.y));
    globeGroup.rotation.y = rotation.x;
    globeGroup.rotation.x = rotation.y;
    render();

    var hasVelocity = Math.abs(velocity.x) > threshold || Math.abs(velocity.y) > threshold;
    var hasLerpDelta = Math.abs(dx) > threshold || Math.abs(dy) > threshold;
    var hasMarkerPulse = markerMeshes.length > 0;
    if (isDragging || rotationSpeed !== 0 || hasVelocity || hasLerpDelta || hasMarkerPulse) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      animationFrameId = null;
    }
  }
  function startAnimation() {
    if (animationFrameId === null) animationFrameId = requestAnimationFrame(animate);
  }
  if (rotationSpeed !== 0 || markers.length > 0) startAnimation();

  function handlePointerDown(event) {
    isDragging = true;
    velocity.x = 0; velocity.y = 0;
    lastMouseX = event.clientX; lastMouseY = event.clientY;
    startAnimation();
    function onMove(moveEvent) {
      var sensitivity = mapLinear(Math.max(0, Math.min(10, dragSpeed)), 0, 10, 0.001, 0.02);
      var dxp = moveEvent.clientX - lastMouseX;
      var dyp = moveEvent.clientY - lastMouseY;
      targetRotation.x += dxp * sensitivity;
      targetRotation.y += dyp * sensitivity;
      targetRotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.y));
      velocity.x = dxp * sensitivity * 0.3;
      velocity.y = dyp * sensitivity * 0.3;
      lastMouseX = moveEvent.clientX; lastMouseY = moveEvent.clientY;
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      isDragging = false;
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }
  canvas.addEventListener('pointerdown', handlePointerDown);

  function handlePointerMove(event) {
    if (!stopOnHover) return;
    isHovering = true;
    startAnimation();
  }
  function handlePointerLeave() { isHovering = false; }
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerleave', handlePointerLeave);
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';

  var resizeObserver = new ResizeObserver(function () {
    var w = container.clientWidth || 600;
    var h = container.clientHeight || 600;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    render();
  });
  resizeObserver.observe(container);

  loadLandFeatures().then(function (landFeatures) {
    var dotCoordinates = [];
    var bitmapWidth = 720, bitmapHeight = 360;
    var offscreen = document.createElement('canvas');
    offscreen.width = bitmapWidth; offscreen.height = bitmapHeight;
    var ctx = offscreen.getContext('2d');
    var projection = geoEquirectangular().fitSize([bitmapWidth, bitmapHeight], { type: 'Sphere' });
    var pathGenerator = geoPath().projection(projection).context(ctx);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, bitmapWidth, bitmapHeight);
    ctx.fillStyle = '#fff'; ctx.beginPath();
    landFeatures.features.forEach(function (f) { pathGenerator(f); });
    ctx.fill();
    var pixels = ctx.getImageData(0, 0, bitmapWidth, bitmapHeight).data;
    function isOnLand(lng, lat) {
      var x = Math.round(((lng + 180) / 360) * bitmapWidth) % bitmapWidth;
      var y = Math.round(((90 - lat) / 180) * bitmapHeight);
      var cy = Math.max(0, Math.min(bitmapHeight - 1, y));
      return pixels[(cy * bitmapWidth + x) * 4] > 128;
    }

    var baseStep = dotSpacing * 0.08;
    for (var lat = -90; lat <= 90; lat += baseStep) {
      var latRad = (Math.abs(lat) * Math.PI) / 180;
      var cosLat = Math.cos(latRad);
      var lngStep = cosLat > 0.01 ? baseStep / Math.max(0.3, cosLat) : 360;
      for (var lng = -180; lng < 180; lng += lngStep) {
        if (isOnLand(lng, lat)) dotCoordinates.push([lng, lat]);
      }
    }

    if (dotCoordinates.length > 0) {
      var dotGeometry = new THREE.SphereGeometry(0.01 * dotSizeMultiplier, 4, 4);
      var dotMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(dotColor),
        transparent: dotRgba.a < 1,
        opacity: dotRgba.a || 1
      });
      var instanced = new THREE.InstancedMesh(dotGeometry, dotMaterial, dotCoordinates.length);
      var matrix = new THREE.Matrix4();
      for (var i = 0; i < dotCoordinates.length; i++) {
        var pos = latLngToPosition(dotCoordinates[i][1], dotCoordinates[i][0]);
        matrix.setPosition(pos.x * globeRadius, pos.y * globeRadius, pos.z * globeRadius);
        instanced.setMatrixAt(i, matrix);
      }
      instanced.instanceMatrix.needsUpdate = true;
      globeGroup.add(instanced);
    }

    addMarkers();
    render();
    canvas.style.opacity = '1';
    if (typeof options.onReady === 'function') options.onReady();
  }).catch(function (err) {
    console.error('[Globe] falha ao carregar mapa:', err);
  });

  return {
    destroy: function () {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  };
}
