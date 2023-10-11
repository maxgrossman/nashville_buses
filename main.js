import './style.css';
import {Feature, Map, Overlay, View} from 'ol';
import * as proj from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import {Control, defaults as defaultControls} from 'ol/control';
import {getRoutes, updateRoutePositions} from './buses';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Point } from 'ol/geom';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Circle from 'ol/style/Circle'
import RegularShape from 'ol/style/RegularShape';

const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const element = document.createElement('div');

class BusInfoController extends Control {
  constructor(opt_options) {
    const options = opt_options || {};

    element.className = 'bus-info-control ol-unselectable ol-control';

    super({
      element: element,
      target: options.target,
    });
  }
}


const overlay = new Overlay({
  element: container,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});

const busSource = new VectorSource({
  features: []
})

const busLayer = new VectorLayer({
  source: busSource
})

const map = new Map({
  target: 'map',
  controls: defaultControls().extend([new BusInfoController()]),
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    busLayer
  ],
  view: new View({
    center: proj.fromLonLat([-86.7816,36.1627]),
    zoom: 12
  })
});

function busStyle (bearing, color) {
  return new Style({
    image: new RegularShape({
      fill: new Fill({color: color || 'grey'}),
      radius: 15 / Math.SQRT2,
      radius2: 15,
      points: 4,
      angle: 0,
      scale: [1, 0.5],
      rotation: bearing || 0
    })
  })
}

let selected = null;

export function drawBusPositions() {
  busSource.clear()
  for (let position of Object.values(window.routesBusPositions)) {
    const {longitude, latitude} = position.vehicle.position
    const busFeature = new Feature({
      occupancy: position.vehicle.occupancy_status,
      trip: position.vehicle.trip,
      bearing: position.vehicle.position.bearing,
      speed: position.vehicle.position.speed,
      geometry:new Point(proj.fromLonLat([longitude, latitude]))
    })
    const currBusStyle = busStyle(position.vehicle.position.bearing)
    busFeature.setStyle(currBusStyle)
    busSource.addFeature(busFeature)
  }
}

function keepRoutesUpdated() {
    updateRoutePositions().then(() => {
      setTimeout(() => keepRoutesUpdated(), 5000)
    })
}

map.once('postrender', function(event) {
  getRoutes().then(routes => {
    for (let route of routes.data) {
      route.route_long_name = route.route_long_name.split(" ")
        .map(s => s.charAt(0).concat(s.substr(1).toLowerCase()))
        .join(" ")
      window.routes[route.route_gid] = route
    }
    keepRoutesUpdated()
  })

})

map.on('pointermove', function (e) {
  if (selected !== null) {
    selected.setStyle(busStyle(selected.getProperties().bearing))
    element.innerHTML = ''
  }

  map.forEachFeatureAtPixel(e.pixel, function (feature) {
    if (feature) {
      const busInfo = feature.getProperties();
      element.innerHTML = `
        <p>Route: ${window.routes[busInfo.trip.route_id].route_long_name}</p>
        <p>Speed: ${busInfo.speed === undefined ? "unknown" : busInfo.speed.toFixed(2)}
        <p>Occupancy: ${busInfo.occupancy === undefined ? "unknown" : busInfo.occupancy}
      `
      overlay.setPosition(feature.getGeometry().getCoordinates())
      selected = feature
      selected.setStyle(busStyle(selected.getProperties().bearing, 'green'))
    }
  })

})