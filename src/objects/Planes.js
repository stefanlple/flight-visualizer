import base64 from "base64-js";
import * as THREE from "three";

import { continentsColorMap, continentsMap } from "../data/continentsMap";
import {
    clusterButton,
    generateSubClusterListItems,
} from "../features/cluster";
import { latLonToCart } from "../utility/latLngToCartSystem";
import { removeObject3D } from "../utility/removeObject3D";
import { removeTrack } from "../utility/removeTrack";

//Access by OpenSky Network
/* import { username, password } from "../../info"; */

import { openskyUrl } from "../config/api.js";
import Aircraft from "./Aircraft";

export default class Planes extends THREE.Group {
    constructor(state) {
        super();
        this.state = state;
        // Bind the `this` context of the `renderPlanes` method to `this`
        this.state.renderPlanes = this.state?.renderPlanes?.bind(this);
        this.name = "planes";
        this.plane3dObjects = [];
        this.planeObjects = [];
        this.fetchURL = "https://opensky-network.org/api/states/all";

        this.filterBarItemList = [];

        this.defaultFilterParameters = {
            CALLSIGN: "",
            ICAO: "",
            COUNTRY: "",
            ALTITUDE: {
                min: 0,
                max: 19500,
            },
            VELOCITY: {
                min: 0,
                max: 1300,
            },
            "VERTICAL-RATE": {
                min: -30,
                max: 30,
            },
            "ON-GROUND": null,
        };

        this.filterParameters = {
            CALLSIGN: "",
            ICAO: "",
            COUNTRY: "",
            ALTITUDE: {
                min: 0,
                max: 19500,
            },
            VELOCITY: {
                min: 0,
                max: 1300,
            },
            "VERTICAL-RATE": {
                min: -30,
                max: 30,
            },
            "ON-GROUND": null,
        };

        this.filterIndexMap = {
            CALLSIGN: 1,
            ICAO: 0,
            COUNTRY: 2,
            ALTITUDE: 7,
            VELOCITY: 9,
            "VERTICAL-RATE": 11,
            "ON-GROUND": 8,
        };

        this.countrySet = new Set();

        this.continentsMap = continentsMap;
        this.continentsColorMap = continentsColorMap;

        //ON START
        (async () => {
            this.addEventListenerToButtons();
            this.getListItemNodes();
            this.manageFilterParameters();
            await this.render();
            await generateSubClusterListItems(this.countrySet);

            //only for dev
            function findElementsNotInArray(arr1, arr2) {
                const elementsNotInArr1 = arr2.filter(
                    (element) => !arr1.includes(element),
                );
                //console.log("PLEASE ADD THIS TO COUNTRIES MAP", elementsNotInArr1);
            }

            findElementsNotInArray(
                (() => {
                    const continents = Object.values(this.continentsMap);
                    const mergedArray = continents.reduce(
                        (acc, countries) => [...acc, ...countries],
                        [],
                    );
                    return mergedArray;
                })(),
                Array.from(this.countrySet),
            );
        })(this);
    }

    addEventListenerToButtons() {
        document
            .querySelector(".reset-button")
            .addEventListener("click", () => {
                {
                    this.filterParameters = { ...this.defaultFilterParameters };
                    clusterButton.innerHTML = "Group";
                    console.log("filter-parameters", this.filterParameters);
                    this.render();
                }
            });
    }

    getListItemNodes() {
        this.filterBarItemList = document.querySelectorAll(".filter-bar-item");
    }

    manageFilterParameters() {
        const updateFilterParameters = () => {
            this.filterBarItemList.forEach((e) => {
                const classname = e.classList[1]
                    .replace("filter-", "")
                    .replace("-item", "")
                    .toUpperCase();

                const isHidden = e.classList.contains("hidden");

                switch (classname) {
                    case "CALLSIGN":
                    case "ICAO":
                    case "COUNTRY":
                        this.filterParameters[classname] = isHidden
                            ? this.defaultFilterParameters[classname]
                            : e.children[2].children[0].value;
                        break;
                    case "ALTITUDE":
                    case "VELOCITY":
                    case "VERTICAL-RATE":
                        if (isHidden) {
                            this.filterParameters[classname].min =
                                this.defaultFilterParameters[classname].min;
                            this.filterParameters[classname].max =
                                this.defaultFilterParameters[classname].max;
                        } else {
                            this.filterParameters[classname].min = Math.round(
                                Number(e.querySelector("#min").value),
                            );
                            this.filterParameters[classname].max = Math.round(
                                Number(e.querySelector("#max").value),
                            );
                        }
                        break;
                    case "ON-GROUND":
                        this.filterParameters[classname] = isHidden
                            ? this.defaultFilterParameters[classname]
                            : e.children[2].children[0].checked;
                        break;
                }
            });
        };

        document
            .querySelector(".apply-button")
            .addEventListener("click", () => {
                updateFilterParameters();
                removeTrack();
                this.render();
                console.log("filter-parameters", this.filterParameters);
            });
    }

    async render() {
        // Call `renderPlanes` in the context of `Planes`
        await this.state.renderPlanes();
    }

    checkPlaneOnParameter(filterParameters, plane) {
        let filter = true;
        /* console.log("current planes"); */
        for (const [key, value] of Object.entries(filterParameters)) {
            /* console.log(
        "check if parameters match:",
        filterParameters[key] || "undefined",
        "&&",
        plane[this.filterIndexMap[key]]
      ); */

            const checkNotBetween = (x, min, max) => !(x >= min && x <= max);
            switch (key) {
                case "CALLSIGN":
                    if (filterParameters[key] !== "") {
                        if (
                            filterParameters[key] !==
                            plane[this.filterIndexMap[key]].trim()
                        ) {
                            filter = false;
                        }
                    }
                    break;
                case "ICAO":
                case "COUNTRY":
                    if (filterParameters[key] !== "") {
                        if (
                            filterParameters[key] !==
                            plane[this.filterIndexMap[key]]
                        ) {
                            filter = false;
                        }
                    }
                    break;
                case "ALTITUDE":
                case "VELOCITY":
                case "VERTICAL-RATE":
                    if (
                        checkNotBetween(
                            plane[this.filterIndexMap[key]],
                            filterParameters[key].min,
                            filterParameters[key].max,
                        )
                    ) {
                        filter = false;
                    }
                    break;
                case "ON-GROUND":
                    if (filterParameters[key] !== null) {
                        if (
                            filterParameters[key] !==
                            plane[this.filterIndexMap[key]]
                        ) {
                            filter = false;
                        }
                    }
                    break;
            }
        }

        return filter;
    }

    /*   async renderPlanes() {
    //plus two to lift the planes up
    const globeRadius = 102;

    //remove all previous planes
    this.plane3dObjects.forEach((e, i) => {
      removeObject3D(e);
      window.scene.remove(e);
    });
    this.plane3dObjects = [];
    this.planeObjects = [];

    console.log("remove previous planes", {
      "planes objecs": this.planeObjects.length,
      "planes 3d objecs": this.plane3dObjects.length,
      children: this.children.length,
    });

    const fetchPlaneObjects = async () => {
      const credentials = `${username}:${password}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(credentials);
      const encodedCredentials = base64.fromByteArray(data);
      const response = await fetch(this.fetchURL, {
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
        },
      });

      const jsonData = await response.json();
      this.planeObjects = jsonData.states;
    };

    await fetchPlaneObjects();

    //get min and max velocity
    const velocityArray = this.planeObjects.map((e) => e[9]);

    const maxVelocity = Math.max.apply(null, velocityArray);
    const minVelocity = Math.min.apply(null, velocityArray);

    console.log("min velocity", minVelocity, "maxVelocity", maxVelocity);

    for (const plane of this.planeObjects) {
      //update country set
      this.updateCountrySet(this.countrySet, plane[2]);

      const clusterText = clusterButton.innerHTML;

      //filter out planes base on parameters
      if (this.checkPlaneOnParameter(this.filterParameters, plane)) {
        const aircraft = new Aircraft();
        const [x, y, z] = plane[8]
          ? latLonToCart(plane[6], plane[5], 0, 100)
          : latLonToCart(plane[6], plane[5], plane[7], globeRadius);
        const orientation = plane[10];
        aircraft.translateX(x);
        aircraft.translateY(y);
        aircraft.translateZ(z);
        aircraft.icao24 = plane[0];

        aircraft.lookAt(0, 0, 0);
        aircraft.rotateZ(THREE.MathUtils.degToRad(orientation));

        const colorValue = plane[8] ? 0xffffff : 0xff0000;

        aircraft.material.color = new THREE.Color(colorValue);
        aircraft.material.emissive = new THREE.Color(colorValue);

        //Grouping by color
        if (clusterText !== "Group") {
          if (clusterText === "By Continent") {
            aircraft.material.color = new THREE.Color(
              this.continentsColorMap[this.findContinent(plane[2])]
            );
            aircraft.material.emissive = new THREE.Color(
              this.continentsColorMap[this.findContinent(plane[2])]
            );
          } else {
            if (plane[2] === clusterText) {
              aircraft.material.color = new THREE.Color(0x00ff00);
              aircraft.material.emissive = new THREE.Color(0x00ff00);
            }
          }
        }

        this.add(aircraft);
        this.plane3dObjects.push(aircraft);
      }
    }
    //removeTrack();

    console.log("after render new planes", {
      "planes objecs": this.planeObjects.length,
      "planes 3d objecs": this.plane3dObjects.length,
      children: this.children.length,
    });
  } */

    findContinent(countryName) {
        for (const continent in continentsMap) {
            if (continentsMap[continent].includes(countryName)) {
                return continent;
            }
        }
        return "Unknown Continent"; // If the country doesn't match any continent in the map
    }
}

class State {
    constructor() {}
}

/** @deprecated Historical mode + MongoDB backend — not used for live deployment */
export class HistoricalState extends State {
    constructor() {
        super();
    }
    async renderPlanes() {
        //plus two to lift the planes up
        const globeRadius = 102;

        //remove all previous planes
        this.plane3dObjects.forEach((e, i) => {
            removeObject3D(e);
            window.scene.remove(e);
        });
        this.plane3dObjects = [];
        this.planeObjects = [];

        console.log("remove previous planes", {
            "planes objecs": this.planeObjects.length,
            "planes 3d objecs": this.plane3dObjects.length,
            children: this.children.length,
        });

        const fetchHistoricalFlightData = async (date) => {
            try {
                const url = `http://localhost:3000/api/flight/data?date=${date}`;

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }

                const data = await response.json();
                console.log(data);
                this.planeObjects = data;
            } catch (error) {
                console.error("Fetch error:", error);
                throw error;
            }
        };

        function degToRad(degrees) {
            return degrees * (Math.PI / 180);
        }

        function radToDeg(radians) {
            return radians * (180 / Math.PI);
        }

        function calculateBearing(startPoint, endPoint) {
            let lat1 = degToRad(startPoint.latitude);
            let lat2 = degToRad(endPoint.latitude);
            let deltaLon = degToRad(endPoint.longitude - startPoint.longitude);

            let y = Math.sin(deltaLon) * Math.cos(lat2);
            let x =
                Math.cos(lat1) * Math.sin(lat2) -
                Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
            let bearing = Math.atan2(y, x);

            // Convert bearing from radians to degrees
            bearing = radToDeg(bearing);

            // Adjust bearing to be within range 0-360 degrees
            bearing = (bearing + 360) % 360;

            return bearing;
        }

        // Calculate the destination point from given point having travelled the given distance (in km), on the given initial bearing (bearing may vary before destination is reached)
        function calculateDestinationLocation(point, bearing, distance) {
            distance = distance / 6371000; // convert to angular distance in radians
            bearing = degToRad(bearing); // convert bearing in degrees to radians

            let lat1 = degToRad(point.latitude);
            let lon1 = degToRad(point.longitude);

            let lat2 = Math.asin(
                Math.sin(lat1) * Math.cos(distance) +
                    Math.cos(lat1) * Math.sin(distance) * Math.cos(bearing),
            );
            let lon2 =
                lon1 +
                Math.atan2(
                    Math.sin(bearing) * Math.sin(distance) * Math.cos(lat1),
                    Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2),
                );
            lon2 = ((lon2 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI; // normalize to -180 - + 180 degrees

            return { latitude: radToDeg(lat2), longitude: radToDeg(lon2) };
        }

        /*  Harvsine Formular */
        function calculateDistanceBetweenLocations(startPoint, endPoint) {
            let lat1 = degToRad(startPoint.latitude);
            let lon1 = degToRad(startPoint.longitude);

            let lat2 = degToRad(endPoint.latitude);
            let lon2 = degToRad(endPoint.longitude);

            let deltaLat = lat2 - lat1;
            let deltaLon = lon2 - lon1;

            let a =
                Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) *
                    Math.cos(lat2) *
                    Math.sin(deltaLon / 2) *
                    Math.sin(deltaLon / 2);
            let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return 6371000 * c;
        }
        /* / Harvsine Formular */

        //Testing Date
        let testDate = new Date("2020-04-02T18:00:00Z");

        await fetchHistoricalFlightData(testDate);

        function calculateDateFraction(date1, date2, dateBetween) {
            // Calculate the time difference in milliseconds
            const totalTime = date2 - date1;
            const elapsedTime = dateBetween - date1;

            // Calculate the fraction as a percentage
            const fractionPercentage = elapsedTime / totalTime;

            return fractionPercentage.toFixed(2);
        }

        //LOOP

        // -----------------TESTING-----------------
        for (const plane of this.planeObjects) {
            for (let i = 0.1; i <= 1; i += 0.1) {
                const bearing = calculateBearing(
                    {
                        latitude: plane.latitude_1,
                        longitude: plane.longitude_1,
                    },
                    {
                        latitude: plane.latitude_2,
                        longitude: plane.longitude_2,
                    },
                );

                const intermediaryLocation = calculateDestinationLocation(
                    { latitude: plane.latitude_1, longitude: plane.latitude_1 },
                    bearing,
                    calculateDistanceBetweenLocations(
                        {
                            latitude: plane.latitude_1,
                            longitude: plane.longitude_1,
                        },
                        {
                            latitude: plane.latitude_2,
                            longitude: plane.longitude_2,
                        },
                    ) * i,
                );

                const aircraft = new THREE.Mesh(
                    new THREE.SphereGeometry(0.8),
                    new THREE.MeshBasicMaterial({ color: 0xff0000 }),
                );
                const [aircraftx1, aircrafty1, aircraftz1] = latLonToCart(
                    intermediaryLocation.latitude,
                    intermediaryLocation.longitude,
                    0,
                    globeRadius,
                );
                aircraft.translateX(aircraftx1);
                aircraft.translateY(aircrafty1);
                aircraft.translateZ(aircraftz1);
                aircraft.lookAt(0, 0, 0);
                this.add(aircraft);

                this.plane3dObjects.push(aircraft);
            }
        }

        //-----------------TESTING-----------------

        const bearing = calculateBearing(
            {
                latitude: this.planeObjects[0].latitude_1,
                longitude: this.planeObjects[0].longitude_1,
            },
            {
                latitude: this.planeObjects[0].latitude_2,
                longitude: this.planeObjects[0].longitude_2,
            },
        );

        const intermediaryLocation = calculateDestinationLocation(
            {
                latitude: this.planeObjects[0].latitude_1,
                longitude: this.planeObjects[0].latitude_1,
            },
            bearing,
            calculateDistanceBetweenLocations(
                {
                    latitude: this.planeObjects[0].latitude_1,
                    longitude: this.planeObjects[0].longitude_1,
                },
                {
                    latitude: this.planeObjects[0].latitude_2,
                    longitude: this.planeObjects[0].longitude_2,
                },
            ) *
                calculateDateFraction(
                    new Date(this.planeObjects[0].firstseen),
                    new Date(this.planeObjects[0].lastseen),
                    testDate,
                ),
        );

        const aircraft = new THREE.Mesh(
            new THREE.SphereGeometry(2),
            new THREE.MeshBasicMaterial({ color: 0xff0000 }),
        );
        const [aircraftx1, aircrafty1, aircraftz1] = latLonToCart(
            intermediaryLocation.latitude,
            intermediaryLocation.longitude,
            0,
            globeRadius,
        );
        aircraft.translateX(aircraftx1);
        aircraft.translateY(aircrafty1);
        aircraft.translateZ(aircraftz1);
        aircraft.lookAt(0, 0, 0);
        this.add(aircraft);

        this.plane3dObjects.push(aircraft);
        console.log("after render new planes", {
            "planes objecs": this.planeObjects.length,
            "planes 3d objecs": this.plane3dObjects.length,
            children: this.children.length,
        });
    }
}

export class RealtimeState extends State {
    constructor() {
        super();
    }
    async renderPlanes() {
        //plus two to lift the planes up
        const globeRadius = 102;

        //remove all previous planes
        this.plane3dObjects.forEach((e, i) => {
            removeObject3D(e);
            window.scene.remove(e);
        });
        this.plane3dObjects = [];
        this.planeObjects = [];

        console.log("remove previous planes", {
            "planes objecs": this.planeObjects.length,
            "planes 3d objecs": this.plane3dObjects.length,
            children: this.children.length,
        });

        const fetchPlaneObjects = async () => {
            /*     const credentials = `${username}:${password}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(credentials);
      const encodedCredentials = base64.fromByteArray(data); */
            // const response = await fetch(this.fetchURL, {
            /*    headers: {
          Authorization: `Basic ${encodedCredentials}`,
        }, */
            // });

            const response = await fetch(openskyUrl("/states/all"));

            const jsonData = await response.json();
            this.planeObjects = jsonData.states;
        };

        await fetchPlaneObjects();

        //get min and max velocity
        const velocityArray = this.planeObjects.map((e) => e[9]);

        const maxVelocity = Math.max.apply(null, velocityArray);
        const minVelocity = Math.min.apply(null, velocityArray);

        console.log("min velocity", minVelocity, "maxVelocity", maxVelocity);

        const updateCountrySet = (set, country) => {
            if (country !== "") {
                set.add(country);
            }
        };

        for (const plane of this.planeObjects) {
            //update country set
            updateCountrySet(this.countrySet, plane[2]);

            const clusterText = clusterButton.innerHTML;

            //filter out planes base on parameters
            if (this.checkPlaneOnParameter(this.filterParameters, plane)) {
                const aircraft = new Aircraft();
                const [x, y, z] = plane[8]
                    ? latLonToCart(plane[6], plane[5], 0, 100)
                    : latLonToCart(plane[6], plane[5], plane[7], globeRadius);
                const orientation = plane[10];
                aircraft.translateX(x);
                aircraft.translateY(y);
                aircraft.translateZ(z);
                aircraft.icao24 = plane[0];

                const [, , , , , longitude, latitude, altitude] = plane;
                aircraft.positionData = [latitude, longitude, altitude];

                aircraft.lookAt(0, 0, 0);
                aircraft.rotateZ(THREE.MathUtils.degToRad(orientation));

                const colorValue = plane[8] ? 0xffffff : 0xff0000;

                aircraft.material.color = new THREE.Color(colorValue);
                aircraft.material.emissive = new THREE.Color(colorValue);

                //Grouping by color
                if (clusterText !== "Group") {
                    if (clusterText === "By Continent") {
                        aircraft.material.color = new THREE.Color(
                            this.continentsColorMap[
                                this.findContinent(plane[2])
                            ],
                        );
                        aircraft.material.emissive = new THREE.Color(
                            this.continentsColorMap[
                                this.findContinent(plane[2])
                            ],
                        );
                    } else {
                        if (plane[2] === clusterText) {
                            aircraft.material.color = new THREE.Color(0x00ff00);
                            aircraft.material.emissive = new THREE.Color(
                                0x00ff00,
                            );
                        }
                    }
                }

                this.add(aircraft);
                this.plane3dObjects.push(aircraft);
            }
        }
        //removeTrack();

        console.log("after render new planes", {
            "planes objecs": this.planeObjects.length,
            "planes 3d objecs": this.plane3dObjects.length,
            children: this.children.length,
        });
    }
}
