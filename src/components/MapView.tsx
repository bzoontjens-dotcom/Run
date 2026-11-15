import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EUROPE_BOUNDS, pointsEvery } from '../lib/geo';
import type { LatLng } from '../lib/types';

export interface MapHandle {
  flyTo(point: LatLng, zoom?: number): void;
  fit(coords: LatLng[]): void;
}

interface Props {
  start: LatLng | null;
  /** Zelf gekozen tussenpunten (zonder het startpunt). */
  waypoints?: LatLng[];
  route?: LatLng[];
  /** Eigen locatie, als blauw stipje. */
  user?: LatLng | null;
  /** Voorgesteld nieuw startpunt, als doorschijnende speld. */
  pending?: LatLng | null;
  /** Past bij het eerste tonen de kaart op de route in, zonder animatie. */
  fitOnMount?: boolean;
  /** Ruimte bovenaan die door de zoekbalk wordt bedekt. */
  topInset?: number;
  onTap?: (point: LatLng) => void;
  onStartMove?: (point: LatLng) => void;
}

const pin = (className: string, size: number, html = '') =>
  L.divIcon({ className: `pin ${className}`, html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

const MapView = forwardRef<MapHandle, Props>(function MapView(
  { start, waypoints = [], route = [], user = null, pending = null, fitOnMount, topInset = 16, onTap, onStartMove },
  ref,
) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ route: L.LayerGroup; points: L.LayerGroup; user: L.LayerGroup } | null>(null);
  const handlers = useRef({ onTap, onStartMove });
  handlers.current = { onTap, onStartMove };
  const inset = useRef(topInset);
  inset.current = topInset;

  const fit = (coords: LatLng[], animate: boolean) => {
    if (!map.current || coords.length === 0) return;
    map.current.fitBounds(L.latLngBounds(coords), {
      paddingTopLeft: [28, inset.current + 12],
      paddingBottomRight: [28, 28],
      maxZoom: 16,
      animate,
    });
  };

  useImperativeHandle(ref, () => ({
    flyTo(point, zoom = 14) {
      map.current?.flyTo(point, zoom, { duration: 0.9 });
    },
    fit(coords) {
      fit(coords, true);
    },
  }));

  useEffect(() => {
    const b = EUROPE_BOUNDS;
    const m = L.map(el.current!, {
      center: [50.5, 9],
      zoom: 4,
      minZoom: 4,
      maxZoom: 19,
      zoomControl: false,
      maxBounds: [
        [b.south - 4, b.west - 6],
        [b.north + 4, b.east + 6],
      ],
      maxBoundsViscosity: 0.8,
    });
    m.attributionControl.setPrefix(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    layers.current = {
      route: L.layerGroup().addTo(m),
      points: L.layerGroup().addTo(m),
      user: L.layerGroup().addTo(m),
    };
    m.on('click', (e) => handlers.current.onTap?.([e.latlng.lat, e.latlng.lng]));
    map.current = m;

    // De kaart verandert van formaat als het paneel eronder groeit of de tab wisselt.
    const observer = new ResizeObserver(() => m.invalidateSize({ animate: false }));
    observer.observe(el.current!);

    if (fitOnMount && route.length) fit(route, false);
    else if (start) m.setView(start, 14, { animate: false });

    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
      layers.current = null;
    };
    // Alleen bij het aanmaken; latere wijzigingen lopen via de effecten hieronder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const group = layers.current?.route;
    if (!group) return;
    group.clearLayers();
    if (route.length < 2) return;
    L.polyline(route, { className: 'route-casing', weight: 9, interactive: false }).addTo(group);
    L.polyline(route, { className: 'route-line', weight: 5, interactive: false }).addTo(group);
    // Kilometerpaaltjes: elke kilometer, of elke vijf bij lange routes.
    const km = route.length > 1 ? pointsEvery(route, 1000) : [];
    const step = km.length > 16 ? 5 : 1;
    km.forEach((point, i) => {
      const n = i + 1;
      if (n % step !== 0) return;
      L.marker(point, { icon: pin('pin-km', 22, String(n)), interactive: false, keyboard: false }).addTo(group);
    });
  }, [route]);

  useEffect(() => {
    const group = layers.current?.points;
    if (!group) return;
    group.clearLayers();
    waypoints.forEach((point) => {
      L.marker(point, { icon: pin('pin-via', 14), interactive: false, keyboard: false }).addTo(group);
    });
    if (pending) {
      L.marker(pending, { icon: pin('pin-start pin-pending', 30), interactive: false, keyboard: false }).addTo(group);
    }
    if (start) {
      const draggable = !!handlers.current.onStartMove;
      const marker = L.marker(start, {
        icon: pin('pin-start', 30),
        draggable,
        interactive: draggable,
        keyboard: false,
        zIndexOffset: 500,
      }).addTo(group);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        handlers.current.onStartMove?.([p.lat, p.lng]);
      });
    }
  }, [start, waypoints, pending]);

  useEffect(() => {
    const group = layers.current?.user;
    if (!group) return;
    group.clearLayers();
    if (user) L.marker(user, { icon: pin('pin-user', 18), interactive: false, keyboard: false }).addTo(group);
  }, [user]);

  return <div ref={el} className="map" />;
});

export default MapView;
