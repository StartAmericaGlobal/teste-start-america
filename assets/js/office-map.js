/* ============================================================
   Mapa plano pontilhado — Start América
   Desenha um mapa-múndi em pontos a partir do contorno real dos
   continentes, com pinos pulsantes nas posições reais de Orlando
   e São Paulo. Independente do globe.js (evita descompasso de
   versionamento de cache entre os dois módulos).
   ============================================================ */
import { geoEquirectangular, geoPath } from 'https://cdn.jsdelivr.net/npm/d3-geo@3/+esm';

var LAND_GEOJSON_URL = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/50m/physical/ne_50m_land.json';
var landFeaturesPromise = null;

function loadLandFeatures() {
  if (!landFeaturesPromise) {
    landFeaturesPromise = fetch(LAND_GEOJSON_URL).then(function (res) {
      if (!res.ok) throw new Error('Falha ao carregar dados do mapa');
      return res.json();
    });
  }
  return landFeaturesPromise;
}

function mapLinear(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  var t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

var VIEW_W = 720;
var VIEW_H = 360;
var SVG_NS = 'http://www.w3.org/2000/svg';

function project(lat, lng) {
  return {
    x: ((lng + 180) / 360) * VIEW_W,
    y: ((90 - lat) / 180) * VIEW_H
  };
}

/**
 * Inicializa o mapa plano dentro de `container`.
 * options: { dotColor, dotSize, density, markers: [{lat, lng, color}], markerColor }
 */
export function initFlatMap(container, options) {
  options = options || {};
  var dotColor = options.dotColor || 'rgba(148, 163, 184, 0.55)';
  var dotSize = options.dotSize != null ? options.dotSize : 1.3;
  var density = options.density != null ? options.density : 7;
  var dotSpacing = mapLinear(Math.max(1, Math.min(10, density)), 1, 10, 24, 8);
  var markers = options.markers || [];
  var markerColor = options.markerColor || '#E2C98A';

  var svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + VIEW_W + ' ' + VIEW_H);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.classList.add('office-flatmap__svg');
  svg.style.opacity = '0';
  container.appendChild(svg);

  var dotsGroup = document.createElementNS(SVG_NS, 'g');
  dotsGroup.setAttribute('fill', dotColor);
  svg.appendChild(dotsGroup);

  var markersGroup = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(markersGroup);

  markers.forEach(function (m) {
    if (typeof m.lat !== 'number' || typeof m.lng !== 'number') return;
    var pos = project(m.lat, m.lng);

    var halo = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('cx', pos.x);
    halo.setAttribute('cy', pos.y);
    halo.setAttribute('r', 5);
    halo.setAttribute('fill', m.color || markerColor);
    halo.setAttribute('class', 'office-flatmap__halo');
    markersGroup.appendChild(halo);

    var dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', pos.x);
    dot.setAttribute('cy', pos.y);
    dot.setAttribute('r', 2.6);
    dot.setAttribute('fill', m.color || markerColor);
    dot.setAttribute('class', 'office-flatmap__marker');
    markersGroup.appendChild(dot);
  });

  loadLandFeatures().then(function (landFeatures) {
    var bitmapWidth = VIEW_W, bitmapHeight = VIEW_H;
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
    function isOnLand(x, y) {
      return pixels[(y * bitmapWidth + x) * 4] > 128;
    }

    var step = dotSpacing * 0.5;
    var frag = document.createDocumentFragment();
    for (var y = 0; y < bitmapHeight; y += step) {
      for (var x = 0; x < bitmapWidth; x += step) {
        if (isOnLand(Math.min(bitmapWidth - 1, Math.round(x)), Math.min(bitmapHeight - 1, Math.round(y)))) {
          var circle = document.createElementNS(SVG_NS, 'circle');
          circle.setAttribute('cx', x.toFixed(2));
          circle.setAttribute('cy', y.toFixed(2));
          circle.setAttribute('r', dotSize);
          frag.appendChild(circle);
        }
      }
    }
    dotsGroup.appendChild(frag);
    svg.style.transition = 'opacity 700ms ease';
    svg.style.opacity = '1';
    if (typeof options.onReady === 'function') options.onReady();
  }).catch(function (err) {
    console.error('[FlatMap] falha ao carregar mapa:', err);
    svg.style.opacity = '1';
  });

  return {
    destroy: function () {
      if (svg.parentNode) svg.parentNode.removeChild(svg);
    }
  };
}
