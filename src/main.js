import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import * as DAT from "dat.gui";
import Stats from "stats-js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// Own modules
import Stars from "./enviroment/Stars";
import Globe from "./objects/Globe";
import Enviroment from "./enviroment/Enviroment";
import Sun from "./objects/Sun";
import Planes from "./objects/Planes";
import { RealtimeState, HistoricalState } from "./objects/Planes"; // HistoricalState: deprecated
import Airports from "./objects/Airports";

//Utilities
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// Event functions
import { updateAspectRatio } from "./eventfunctions/updateAspectRatio.js";
import { calculateMousePosition } from "./eventfunctions/calculateMousePosition.js";
import { executeRaycastOnClick } from "./eventfunctions/executeRaycastOnClick.js";
import { latLonToCart } from "./utility/latLngToCartSystem";
import { executeRaycastOnMove } from "./eventfunctions/executeRaycastOnMove";
import { calculateLinearPosition } from "./utility/calculateLinearPosition";

function mainRealTime() {
  initializeScene();

  const target = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    }
  );
  target.samples = 8;

  const composer = new EffectComposer(window.renderer, target);
  composer.addPass(new RenderPass(window.scene, window.camera));
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5,
      3,
      1
    )
  );

  const orbitControls = new OrbitControls(
    window.camera,
    window.renderer.domElement
  );
  orbitControls.target = new THREE.Vector3(0, 0, 0);
  orbitControls.minDistance = 122;
  orbitControls.maxDistance = 380;
  orbitControls.enablePan = false;

  orbitControls.addEventListener("start", () => {
    window.camera.cameraRotateAroundGlobe = false;
  });
  window.orbitcontrols = orbitControls;

  orbitControls.update();

  const planes = new Planes(new RealtimeState());
  window.scene.add(planes);

  const sun = new Sun();

  let subsolarPosition = sun.getSubsolarPoint(Date.now());
  let sunPosition = calculateLinearPosition(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(
      latLonToCart(
        subsolarPosition.latitude,
        subsolarPosition.longitude,
        0,
        102
      )[0],
      latLonToCart(
        subsolarPosition.latitude,
        subsolarPosition.longitude,
        0,
        102
      )[1],
      latLonToCart(
        subsolarPosition.latitude,
        subsolarPosition.longitude,
        0,
        102
      )[2]
    ),
    50
  );
  sun
    .getDirectionalLight()
    .position.set(sunPosition.x, sunPosition.y, sunPosition.z);
  sun.updateSun();
  window.scene.add(sun);

  var stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
  stats.domElement.style.top = "25%";

  window.camera.cameraRotateAroundGlobe = true;

  var lastTimeStamp = 0;
  let fetchTimeInSeconds = 30;

  function mainLoop(nowTimestamp) {
    stats.begin();

    if (nowTimestamp - lastTimeStamp >= fetchTimeInSeconds * 1000) {
      lastTimeStamp = nowTimestamp;
      console.log(`${fetchTimeInSeconds} seconds passed`);
      planes.render();

      subsolarPosition = sun.getSubsolarPoint(Date.now());
      sunPosition = calculateLinearPosition(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
          latLonToCart(
            subsolarPosition.latitude,
            subsolarPosition.longitude,
            0,
            102
          )[0],
          latLonToCart(
            subsolarPosition.latitude,
            subsolarPosition.longitude,
            0,
            102
          )[1],
          latLonToCart(
            subsolarPosition.latitude,
            subsolarPosition.longitude,
            0,
            102
          )[2]
        ),
        50
      );
      sun
        .getDirectionalLight()
        .position.set(sunPosition.x, sunPosition.y, sunPosition.z);
      sun.updateSun();
    }

    if (window.camera.cameraRotateAroundGlobe) {
      const rotationSpeed = 0.0001; // Adjust the rotation speed as desired
      const globeCenter = new THREE.Vector3(0, 0, 0); // Center of the globe
      const radius = 300;

      const angle = rotationSpeed * (nowTimestamp - lastTimeStamp);
      const cameraX = globeCenter.x + radius * Math.cos(angle);
      const cameraZ = globeCenter.z + radius * Math.sin(angle);

      window.camera.position.set(cameraX, 160, cameraZ);
    }

    orbitControls.update();
    TWEEN.update();

    requestAnimationFrame(mainLoop);

    composer.render();

    //  window.renderer.render(window.scene, window.camera);
    stats.end();
  }

  mainLoop();
}

/** @deprecated Historical mode + MongoDB — kept for reference only */
function mainHistorical() {
  initializeScene();

  const target = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    }
  );
  target.samples = 8;

  const composer = new EffectComposer(window.renderer, target);
  composer.addPass(new RenderPass(window.scene, window.camera));
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5,
      3,
      1
    )
  );

  const orbitControls = new OrbitControls(
    window.camera,
    window.renderer.domElement
  );
  orbitControls.target = new THREE.Vector3(0, 0, 0);
  orbitControls.minDistance = 130;
  orbitControls.maxDistance = 380;
  orbitControls.enablePan = false;

  orbitControls.addEventListener("start", () => {
    window.camera.cameraRotateAroundGlobe = false;
  });
  window.orbitcontrols = orbitControls;

  orbitControls.update();

  const sun = new Sun();

  //TODO
  const unixTimestamp =
    window.state === "historical"
      ? new Date("2020-04-02T18:00:00Z").getTime()
      : Date.now();
  let subsolarPosition = sun.getSubsolarPoint(unixTimestamp);
  let sunPosition = calculateLinearPosition(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(
      latLonToCart(
        subsolarPosition.latitude,
        subsolarPosition.longitude,
        0,
        102
      )[0],
      latLonToCart(
        subsolarPosition.latitude,
        subsolarPosition.longitude,
        0,
        102
      )[1],
      latLonToCart(
        subsolarPosition.latitude,
        subsolarPosition.longitude,
        0,
        102
      )[2]
    ),
    50
  );
  sun
    .getDirectionalLight()
    .position.set(sunPosition.x, sunPosition.y, sunPosition.z);
  sun.updateSun();
  window.scene.add(sun);

  var stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
  stats.domElement.style.top = "25%";

  window.camera.cameraRotateAroundGlobe = true;

  //TODO
  const planeStateHistorical = new HistoricalState();
  const planeStateRealtime = new RealtimeState();
  console.log(planeStateHistorical);
  const planeState =
    window.state === "historical" ? planeStateHistorical : planeStateRealtime;

  const planes = new Planes(planeState);
  window.scene.add(planes);

  var lastTimeStamp = 0;
  let fetchTimeInSeconds = 30;

  function mainLoop(nowTimestamp) {
    stats.begin();

    if (nowTimestamp - lastTimeStamp >= fetchTimeInSeconds * 1000) {
      lastTimeStamp = nowTimestamp;
      console.log(`${fetchTimeInSeconds} seconds passed`);
      planes.render();

      //TODO
      subsolarPosition = sun.getSubsolarPoint(Date.now());
      sunPosition = calculateLinearPosition(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
          latLonToCart(
            subsolarPosition.latitude,
            subsolarPosition.longitude,
            0,
            102
          )[0],
          latLonToCart(
            subsolarPosition.latitude,
            subsolarPosition.longitude,
            0,
            102
          )[1],
          latLonToCart(
            subsolarPosition.latitude,
            subsolarPosition.longitude,
            0,
            102
          )[2]
        ),
        50
      );
      sun
        .getDirectionalLight()
        .position.set(sunPosition.x, sunPosition.y, sunPosition.z);
      sun.updateSun();
    }

    if (window.camera.cameraRotateAroundGlobe) {
      const rotationSpeed = 0.0001; // Adjust the rotation speed as desired
      const globeCenter = new THREE.Vector3(0, 0, 0); // Center of the globe
      const radius = 300;

      const angle = rotationSpeed * (nowTimestamp - lastTimeStamp);
      const cameraX = globeCenter.x + radius * Math.cos(angle);
      const cameraZ = globeCenter.z + radius * Math.sin(angle);

      window.camera.position.set(cameraX, 160, cameraZ);
    }

    orbitControls.update();
    TWEEN.update();

    requestAnimationFrame(mainLoop);

    composer.render();

    //  window.renderer.render(window.scene, window.camera);
    stats.end();
  }

  mainLoop();
}

function initializeScene() {
  window.scene = new THREE.Scene();
  //window.scene.add(new THREE.AxesHelper(150));

  window.camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  window.camera.position.set(100, 160, 220);
  window.camera.lookAt(0, 0, 0);

  THREE.ColorManagement.enabled = true;

  window.renderer = new THREE.WebGLRenderer({ antialias: true });
  window.renderer.setSize(window.innerWidth, window.innerHeight);
  window.renderer.setClearColor();

  document.getElementById("3d_content").appendChild(window.renderer.domElement);

  //renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const listener = new THREE.AudioListener();

  // create a global audio source
  const sound = new THREE.Audio(listener);

  const audioLoader = new THREE.AudioLoader();
  audioLoader.load("./src/sounds/background.mp3", function (buffer) {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(parseFloat(0.0175));
    sound.play();
  });

  const enviroment = new Enviroment();
  window.scene.add(enviroment);

  const stars = new Stars();
  window.scene.add(stars);

  const globe = new Globe();
  window.scene.add(globe);
  globe.add(listener);

  const airports = new Airports();
  window.scene.add(airports);

  /* const ball = new THREE.Mesh(
    new THREE.SphereGeometry(2),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  ball.translateX(latLonToCart(34.052235, -118.243683, 0, 102)[0]);
  ball.translateY(latLonToCart(34.052235, -118.243683, 0, 102)[1]);
  ball.translateZ(latLonToCart(34.052235, -118.243683, 0, 102)[2]);
  ball.name = "LOS ANGELES";
  window.scene.add(ball); */
}

window.onresize = updateAspectRatio;
window.addEventListener("mousemove", calculateMousePosition);

document.querySelectorAll("#startButton").forEach((e) => {
  if (e.classList.contains("realtime")) {
    e.addEventListener("click", function () {
      window.state = "realtime";
      mainRealTime();
      document.querySelectorAll("#startButton").forEach((btn) => btn.remove());

      window.addEventListener("mousemove", executeRaycastOnMove);
      window.onclick = executeRaycastOnClick;
      document.querySelector("#cluster-group").style.visibility = "visible";
      document.querySelector(".filter").style.visibility = "visible";
      document.querySelector("#help").style.visibility = "visible";
    });
  }
  // DEPRECATED: historical mode (MongoDB + date picker flow)
  // else { e.addEventListener("click", () => { window.state = "historical"; mainHistorical(); ... }); }
});
/* window.onload = mainRealTime;
window.onresize = updateAspectRatio;
window.addEventListener("mousemove", calculateMousePosition);
window.addEventListener("mousemove", executeRaycastOnMove);
window.onclick = executeRaycastOnClick; */
