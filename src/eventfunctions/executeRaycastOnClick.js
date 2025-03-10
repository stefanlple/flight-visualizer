import * as TWEEN from "@tweenjs/tween.js";
import BASE64 from "base64-js";
import * as D3 from "d3";
import * as THREE from "three";

import { calculateLinearPosition } from "../utility/calculateLinearPosition";
import { findObjectByName } from "../utility/findObjectbyName";
import { removeObject3D } from "../utility/removeObject3D";

//Access by OpenSky Network
/* import { password, username } from "../../info"; */

import { openskyUrl } from "../config/api.js";
import { closeAircraftInfo, closeAirportInfo } from "../features/infoBoxs";
import { latLonToCart } from "../utility/latLngToCartSystem";
import { removeTrack } from "../utility/removeTrack";

import Aircraft from "../objects/Aircraft";

window.raycaster = new THREE.Raycaster();

export async function executeRaycastOnClick() {
    //raycast
    window.raycaster.setFromCamera(window.mousePosition, window.camera);
    let intersects = window.raycaster.intersectObject(window.scene, true);

    if (intersects.length > 0) {
        let firstHit = intersects[0].object;

        const aircraft = findObjectByName(firstHit, "aircraft");

        const airport = findObjectByName(firstHit, "airport");

        if (aircraft?.icao24) {
            animationToAircraft(aircraft, aircraft.positionData);
        }

        if (airport) {
            animationToAirport(airport);
        }
    }
}

function animationToAirport(airport) {
    new TWEEN.Tween(window.camera)
        .to(
            {
                position: calculateLinearPosition(
                    new THREE.Vector3(0, 0, 0),
                    airport.position,
                    20,
                ),
            },
            1300,
        )
        .easing(TWEEN.Easing.Sinusoidal.Out)
        .onStart(() => {
            window.orbitcontrols.enabled = false;
            window.camera.cameraRotateAroundGlobe = false;
        })
        .onComplete(() => {
            window.orbitcontrols.enabled = true;
        })
        .start();

    const airportInfoBox = document.getElementById("airport-info-box");
    const airportNameDiv = document.getElementById("airport-name");
    const airportIcaoDiv = document.getElementById("airport-icao");

    airportNameDiv.innerHTML = airport.airportname;
    airportIcaoDiv.innerHTML = airport.icao;
    airportInfoBox.style.width = "auto";
    closeAircraftInfo();
}

async function animationToAircraft(aircraft, positionData) {
    closeAirportInfo();
    new TWEEN.Tween(window.camera)
        .to(
            {
                position: calculateLinearPosition(
                    new THREE.Vector3(0, 0, 0),
                    aircraft.position,
                    20,
                ),
            },
            1300,
        )
        .easing(TWEEN.Easing.Sinusoidal.Out)
        .onStart(() => {
            window.orbitcontrols.enabled = false;
            window.camera.cameraRotateAroundGlobe = false;
        })
        .onComplete(() => {
            window.orbitcontrols.enabled = true;
        })
        .start();

    const icao24 = aircraft.icao24;

    await Promise.all([
        fetchAircraftOnIcao(icao24),
        drawTrackOnIcao(icao24, positionData),
    ]);
}

async function fetchAircraftOnIcao(icao24) {
    try {
        const response = await fetch(
            openskyUrl(`/states/all?icao24=${icao24}`),
        );
        const jsonData = await response.json();

        if (jsonData.states && jsonData.states.length > 0) {
            console.log("aircraft fetched", jsonData.states[0]);
            displayData(jsonData.states[0]);
        } else {
            console.log("No aircraft data found for ICAO:", icao24);
        }
    } catch (error) {
        console.error("Error fetching aircraft:", error);
    }
}

const globeRadius = 102;

export async function fetchTrackOnIcao(icao24) {
    try {
        /* const credentials = `${username}:${password}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(credentials);
    const encodedCredentials = BASE64.fromByteArray(data); */

        const response = await fetch(
            openskyUrl(`/tracks/all?icao24=${icao24}&time=0`),
        );
        const jsonData = await response.json();
        return jsonData;
    } catch (error) {
        console.log(error);
    }
}

async function drawTrackOnIcao(icao24, positionData) {
    removeTrack();
    try {
        const jsonData = await fetchTrackOnIcao(icao24);

        console.log(positionData);
        const [latitude, longitude, altitude, trueTrack] = positionData;

        const pathJson = jsonData.path;
        const pathPoints = [];
        pathJson.forEach((e) => {
            const [x, y, z] = latLonToCart(e[1], e[2], e[3], globeRadius);
            pathPoints.push(new THREE.Vector3(x, y, z));
        });

        const [x, y, z] = latLonToCart(
            latitude,
            longitude,
            altitude,
            globeRadius,
        );
        pathPoints.push(new THREE.Vector3(x, y, z));

        const track = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pathPoints),
            new THREE.LineBasicMaterial({
                color: 0x00ff00,
                linewidth: 5,
            }),
        );
        track.name = "track";
        window.scene.add(track);
        drawGraphAndPlane(pathJson, track);
    } catch (error) {
        console.log(error);
    }
}

function drawGraphAndPlane(dataPoints, track) {
    // Sample data points
    const dataTrack = [];

    dataPoints.forEach((e) => {
        const timestamp = e[0];
        const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
        dataTrack.push({
            time: date,
            altitude: e[3],
            position: {
                latitude: e[1],
                longitude: e[2],
                trueTrack: e[4],
            },
        });
    });
    //remove previous content
    D3.select("#graph").selectAll("*").remove();

    // Set up dimensions and margins for the graph
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = 500 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    // Create an SVG container
    const svg = D3.select("#graph")
        .attr(
            "viewBox",
            `0 0 ${width + margin.left + margin.right} ${
                height + margin.top + margin.bottom
            }`,
        )
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define scales for x and y axes
    const xScale = D3.scaleTime()
        .domain(D3.extent(dataTrack, (d) => d.time))
        .range([0, width]);

    const yScale = D3.scaleLinear()
        .domain([0, D3.max(dataTrack, (d) => d.altitude)])
        .range([height, 0]);

    // Create x and y axes
    const xAxis = D3.axisBottom(xScale).tickFormat(D3.timeFormat("%H:%M"));
    const yAxis = D3.axisLeft(yScale);

    // Append x and y axes to the SVG container
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .append("text") // X-axis label
        .attr("x", width / 2)
        .attr("y", margin.bottom)
        .attr("fill", "#fff")
        .attr("text-anchor", "middle")
        .text("Time");

    svg.append("g")
        .call(yAxis)
        .append("text") // Y-axis label
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("fill", "#fff")
        .attr("text-anchor", "middle")
        .text("Altitude (meters)");

    // Create a line generator for the altitude path
    const line = D3.line()
        .x((d) => xScale(d.time))
        .y((d) => yScale(d.altitude));

    // Draw the altitude path
    svg.append("path")
        .datum(dataTrack)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);

    // Add data points as circles
    svg.selectAll(".datapoint")
        .data(dataTrack)
        .enter()
        .append("circle")
        .attr("class", "datapoint")
        .attr("cx", (d) => xScale(d.time))
        .attr("cy", (d) => yScale(d.altitude))
        .attr("r", 3)
        .attr("fill", "steelblue")
        .on("mouseover", (event, d) => {
            // Show tooltip on mouseover
            tooltip
                .style("opacity", 1)
                .html(
                    `Time: ${d.time.getHours()}:${d.time.getMinutes()}, Altitude: ${
                        d.altitude
                    }`,
                )
                .style("left", `${event.pageX}px`)
                .style("top", `${event.pageY}px`);

            const [x, y, z] = latLonToCart(
                d.position.latitude,
                d.position.longitude,
                d.altitude,
                102.1,
            );
            if (track.children.length === 0) {
                const aircraft = new Aircraft();

                aircraft.material.color = new THREE.Color(0x00ff00);
                aircraft.material.emissive = new THREE.Color(0x00ff00);

                aircraft.position.set(x, y, z);
                aircraft.lookAt(0, 0, 0);
                aircraft.rotateZ(
                    THREE.MathUtils.degToRad(d.position.trueTrack),
                );
                track.add(aircraft);
            }
        })
        .on("mouseout", () => {
            // Hide tooltip on mouseout
            if (track.children.length !== 0) {
                removeObject3D(track.children[0]);
            }
            tooltip.style("opacity", 0);
        });

    // Create a tooltip element
    const tooltip = D3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const trackBox = document.getElementById("altitude-box");
    trackBox.style.height = "250px";
}

function displayData(data) {
    const aircraftInfoBox = document.getElementById("aircraft-info-box");

    const icao = document.getElementById("icao");
    const callSign = document.getElementById("call-sign");
    const originCountry = document.getElementById("origin-country");
    const longitude = document.getElementById("longitude");
    const latitude = document.getElementById("latitude");
    const baromAltitude = document.getElementById("barom-altitude");
    const geoAltitude = document.getElementById("geo-altitude");
    const verticalRate = document.getElementById("vertical-rate");
    const velocity = document.getElementById("velocity");
    const trueTrack = document.getElementById("true-track");
    const onGround = document.getElementById("on-ground");
    const source = document.getElementById("source");

    icao.innerHTML = data[0];
    callSign.innerHTML = data[1];
    originCountry.innerHTML = data[2];
    longitude.innerHTML = data[5] + " &#176";
    latitude.innerHTML = data[6] + " &#176";
    baromAltitude.innerHTML = Math.round(data[7]) + " meters";
    geoAltitude.innerHTML = Math.round(data[13]) + " meters";
    verticalRate.innerHTML = !!data[11] ? `${data[11]} m/s` : "N/A";
    velocity.innerHTML = data[9] + " m/s";
    trueTrack.innerHTML = data[10] + " &#176";
    onGround.innerHTML = data[8];
    source.innerHTML = {
        0: "ADS-B",

        1: "ASTERIX",

        2: "MLAT",

        3: "FLARM",
    }[data[16]];

    aircraftInfoBox.style.width = "auto";
}
