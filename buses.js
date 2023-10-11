import { drawBusPositions } from "./main";

export function getRoutes() {
    return fetch('https://gtfs.transitnownash.org/routes.json')
        .then(r => r.json())
        .catch(e => {console.log(e); return {data: []}})
}

export function updateRoutePositions() {
    return fetch("https://gtfs.transitnownash.org/realtime/vehicle_positions.json")
        .then(r => r.json())
        .catch(e => {console.log(e); return []})
        .then(positions => {
            for (let position of positions) {
                const route_id = position.vehicle.trip.route_id
                window.routesBusPositions[position.vehicle.trip.route_id] =
                (window.routesBusPositions[position.vehicle.trip.route_id] || {})
                window.routesBusPositions[position.vehicle.trip.route_id] = position;
            }
            drawBusPositions()
        })
}