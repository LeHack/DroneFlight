'use strict';

Physijs.scripts.worker = './vendor/physijs_worker.js';
Physijs.scripts.ammo = './ammo.js';

var camera, leds = [], scene, sky, renderer, controls, drone, rotors;

let loader = new THREE.TGALoader();
let droneTexture = loader.load( '../models/Drone/Drone_D.tga');
let droneMaterial = Physijs.createMaterial(
    new THREE.MeshPhongMaterial( {
        color: 0xffffff,
        map: droneTexture,
        side: THREE.DoubleSide,
    }),
    0.9,
    0
);
//let droneMaterial = new THREE.MeshPhongMaterial( {
//    color: 0xffffff,
//    map: droneTexture,
//    side: THREE.DoubleSide,
//});

// model
loader = new THREE.OBJLoader();
loader.load( '../models/Drone/Body.obj', function ( body ) {
    body.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
            child.material = droneMaterial;
        }
    });

    drone = new Physijs.BoxMesh(
        new THREE.BoxGeometry( 5, 0.6, 2 ),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
        // Uncomment the next line to see the wireframe of the container shape
        // new THREE.MeshBasicMaterial({ wireframe: true, opacity: 0.5 })
    );
    body.position.y = -.2;
    body.castShadow = true;
    body.receiveShadow = true;

    drone.add(body);
    drone.position.x = 0;
    drone.position.z = 0;
    
    drone.setCcdMotionThreshold(1);
    drone.setCcdSweptSphereRadius(0.6);

    loader.load( '../models/Drone/Engine.obj', function ( engine ) {
        engine.traverse( function ( child ) {
            if ( child instanceof THREE.Mesh ) {
                child.material = droneMaterial;
            }
        });
        engine.castShadow = true;
        engine.receiveShadow = true;

        let engineL = engine.clone();
        let engineR = engine.clone();

        engineL.position.x = .73;
        engineL.position.y = .14;
        engineL.position.z = -.1;
        engineR.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));

        engineR.position.x = -.73;
        engineR.position.y = .14;
        engineR.position.z = -.1;

        drone.add(engineL);
        drone.add(engineR);
        drone.position.y = .33;

        init();
        initSky();

        scene.add( drone );

        rotors = new Rotors(drone, engineL, engineR);
        handleInput();

        animate();
    });
});

function init() {

    let container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000000 );
    camera.lookAt(getCameraPoint(drone));

//    controls = new THREE.TrackballControls( camera );
//
//    controls.rotateSpeed = 1.0;
//    controls.zoomSpeed = 1.2;
//    controls.minDistance = 8;
//    controls.maxDistance = 15;
//
//    //controls.noRotate = true;
//    controls.noZoom = true;
//    controls.staticMoving = true;
//    controls.dynamicDampingFactor = 0.3;
//
//    controls.keys = [ 65, 83, 68 ];
//    controls.addEventListener( 'change', render );

    scene = new Physijs.Scene();
    // scene.fog = new THREE.Fog( 0xcccccc, 35, 200 );

    scene.setGravity(new THREE.Vector3( 0, -30, 0 ));

    // Loader
    let texLoader = new THREE.TextureLoader();

    // Materials
    let ground_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ map: texLoader.load( '../textures/rocks.jpg' ) }),
        1, // high friction
        0 // low restitution
    );
    ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
    ground_material.map.repeat.set( 3, 3 );

    // Ground

    let ground_geometry = new THREE.PlaneGeometry( 500, 500, 200, 200 );
    ground_geometry.computeFaceNormals();
    ground_geometry.computeVertexNormals();

    let ground = new Physijs.PlaneMesh(
        ground_geometry,
        ground_material,
        0 // mass
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = 0;
    scene.add( ground );

    let helipad = new Physijs.PlaneMesh(
        new THREE.PlaneGeometry( 6, 6 ),
        new THREE.MeshLambertMaterial( { map: texLoader.load( '../textures/helipad.jpg' ) } ),
        0
    );
    helipad.rotation.x = -Math.PI / 2;
    helipad.receiveShadow = true;
    helipad.position.y = 0.051;
    scene.add( helipad );

    let ledMaterial = new THREE.MeshPhongMaterial({color: 0xff0000});
    for (let x of [-2.9, 0, 2.9]) {
        for (let z of [-2.9, 0, 2.9]) {
            if (x !== 0 || z !== 0) {
                let sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(.05, .05, .05), ledMaterial
                );
                sphere.position.x = x;
                sphere.position.y = 0.051;
                sphere.position.z = z;
                scene.add(sphere);
    
                let led = new THREE.PointLight(0xaa0000, 0.8, 10, 1);
                led.position.x = x;
                led.position.y = 0.0515;
                led.position.z = z;
                leds.push(led);
                scene.add( led );
            }
        }
    }

    
//    let particleLight = new THREE.Mesh( new THREE.SphereGeometry( 16, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
//    scene.add( particleLight );

    // Lights
    scene.add( new THREE.AmbientLight( 0xaaaaaa ) );

//    let directionalLight = new THREE.DirectionalLight(/*Math.random() * 0xffffff*/0xeeeeee );
//    directionalLight.position.x = 0;
//    directionalLight.position.y = 1;
//    directionalLight.position.z = 10;
//    directionalLight.position.normalize();
//    scene.add( directionalLight );

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );
}

function initSky() {
    // Add Sky Mesh
    sky = new THREE.Sky();
    scene.add( sky.mesh );

    // Add Sun Helper
    let sunSphere = new THREE.Mesh(
        new THREE.SphereBufferGeometry( 20000, 16, 8 ),
        new THREE.MeshBasicMaterial( { color: 0xffffff } )
    );
    sunSphere.position.y = - 700000;
    sunSphere.visible = true;
    scene.add( sunSphere );

    let effectController  = {
        turbidity: 1,
        rayleigh: 0.989,
        mieCoefficient: 0,
        mieDirectionalG: 0.161,
        luminance: 1.1,
        inclination: 0.6916, // elevation / inclination
        azimuth: 0.1714, // Facing front,
        sun: true,
    };

    let distance = 400000;
    let uniforms = sky.uniforms;
    uniforms.turbidity.value = effectController.turbidity;
    uniforms.rayleigh.value = effectController.rayleigh;
    uniforms.luminance.value = effectController.luminance;
    uniforms.mieCoefficient.value = effectController.mieCoefficient;
    uniforms.mieDirectionalG.value = effectController.mieDirectionalG;

    let theta = Math.PI * ( effectController.inclination - 0.5 );
    let phi = 2 * Math.PI * ( effectController.azimuth - 0.5 );

    sunSphere.position.x = distance * Math.cos( phi );
    sunSphere.position.y = distance * Math.sin( phi ) * Math.sin( theta );
    sunSphere.position.z = distance * Math.sin( phi ) * Math.cos( theta );

    sunSphere.visible = effectController.sun;

    sky.uniforms.sunPosition.value.copy( sunSphere.position );
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    controls.handleResize();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    requestAnimationFrame( animate );
//    controls.update();

    let dronePoint = getCameraPoint(drone);
    camera.position.x = dronePoint.position.x;
    camera.position.y = dronePoint.position.y;
    camera.position.z = dronePoint.position.z;
    camera.lookAt(dronePoint.lookAt);
    // console.log(dronePoint.lookAt);
    render();
}

function render() {
    let timer = Date.now() * 0.004;
    for (let led of leds) {
        led.power = (1 + Math.sin(timer)) * 3 * Math.PI;
    }

    rotors.updateRotation();
    rotors.updatePitch();
    rotors.updateVelocity();
    scene.simulate();
    renderer.render( scene, camera );
}

var laggedView = null;
function getCameraPoint(drone) {
    var matrix = new THREE.Matrix4();
    matrix.extractRotation( drone.matrix );
    var direction = new THREE.Vector3( 0, 0, .8 );
    direction.applyMatrix4(matrix);

    let dPos = drone.position;
    if (laggedView === null) {
        laggedView = {
            x: dPos.x,
            y: dPos.y,
            z: dPos.z
        };
    }
    else {
        let dist = distance(laggedView, dPos);
        let lagRestore = dist * 0.1;
        if (dist > 0.01) {
            laggedView.x += (lagRestore - 0.095) * Math.abs(dPos.x - laggedView.x) * (dPos.x > laggedView.x ? 1 : -1);
            laggedView.y += (lagRestore + 0.1)   * Math.abs(dPos.y - laggedView.y) * (dPos.y > laggedView.y ? 1 : -1);
            laggedView.z += (lagRestore - 0.095) * Math.abs(dPos.z - laggedView.z) * (dPos.z > laggedView.z ? 1 : -1);
        }
        else if (dist > 0) {
            laggedView = {
                x: dPos.x,
                y: dPos.y,
                z: dPos.z
            };
        }
    }

    let position = new THREE.Vector3(
        (laggedView.x - 6*direction.x),
        (laggedView.y - 6*direction.y + 3),
        (laggedView.z - 6*direction.z)
    );
    return {
        "lookAt": new THREE.Vector3(
            drone.position.x + 3*direction.x,
            (drone.position.y + 3*direction.y + .5),
            drone.position.z + 3*direction.z
        ),
        "position": position,
    };
}

function distance( v1, v2 ) {
    let dx = v1.x - v2.x;
    let dy = v1.y - v2.y;
    let dz = v1.z - v2.z;

    return Math.sqrt( dx * dx + dy * dy + dz * dz );
}


let keysState = {};
let prevState = {};
let handlers = {
    "ArrowUp":        () => { rotors.steer(rotors.direct.FORWARD);  },
    "ArrowDown":      () => { rotors.steer(rotors.direct.BACKWARD); },
    "ArrowLeft":      () => { rotors.steer(rotors.direct.LEFT);     },
    "ArrowRight":     () => { rotors.steer(rotors.direct.RIGHT);    },
    "KeyW":           () => { rotors.steer(rotors.direct.FORWARD);  },
    "KeyS":           () => { rotors.steer(rotors.direct.BACKWARD); },
    "KeyA":           () => { rotors.steer(rotors.direct.LEFT);     },
    "KeyD":           () => { rotors.steer(rotors.direct.RIGHT);    },
    "NumpadMultiply": (state) => { if (toggleKey(state, "burner"))     rotors.toggleBurner();                      },
    "BracketLeft":    (state) => { if (toggleKey(state, "leftRotor"))  rotors.toggleRotorState(rotors.pick.LEFT);  },
    "BracketRight":   (state) => { if (toggleKey(state, "rightRotor")) rotors.toggleRotorState(rotors.pick.RIGHT); },
    "NumpadAdd": () => {
        rotors.accelerate(rotors.pick.LEFT);
        rotors.accelerate(rotors.pick.RIGHT);
    },
    "NumpadSubtract": () => {
        rotors.decelerate(rotors.pick.LEFT);
        rotors.decelerate(rotors.pick.RIGHT);
    },
};

function toggleKey(state, name) {
    let change = (state !== prevState[name])
    if (change) {
        prevState[name] = !prevState[name];
    }
    return (state && change);
}

function handleInput() {
    let toggleKeys = ["NumpadMultiply", "BracketLeft", "BracketRight"];
    for (let k of Object.keys(keysState)) {
        if (handlers[k] && (keysState[k] || toggleKeys.includes(k))){
            handlers[k](keysState[k]);
        }
    }
    let noCtrlKeyPressed = true;
    let controlKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS", "KeyA", "KeyD"];
    for (let k of controlKeys) {
        if (keysState[k]) {
            noCtrlKeyPressed = false;
            break;
        }
    }
    if (noCtrlKeyPressed) {
        rotors.steer();
    }
    setTimeout(handleInput, 30);
}

// attach event handler
document.onkeydown = function(event) { keysState[event.code] = true;  };
document.onkeyup   = function(event) { keysState[event.code] = false; };
