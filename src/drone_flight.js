'use strict';

Physijs.scripts.worker = './vendor/physijs_worker.js';
Physijs.scripts.ammo = './ammo.js';

var camera, scene, renderer, controls, drone, rotors;

let loader = new THREE.TGALoader();
let droneTexture = loader.load( '../models/Drone/Drone_D.tga');
let droneMaterial = new THREE.MeshPhongMaterial( {
    color: 0xffffff,
    map: droneTexture,
    side: THREE.DoubleSide,
});

// model
loader = new THREE.OBJLoader();
loader.load( '../models/Drone/Body.obj', function ( body ) {
    body.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
            child.material = droneMaterial;
        }
    });

    drone = new Physijs.BoxMesh(
        new THREE.BoxGeometry( 5, 0.5, 2 ),
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
        drone.position.y = .25;

        init();

        scene.add( drone );

        rotors = new Rotors(drone, engineL, engineR);
        handleInput();
        animate();

        console.log(drone);
    });
});

function init() {

    let container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 4000 );
    camera.position.set( 0, 4, -5 );
    camera.lookAt(getCameraPoint(drone));

    controls = new THREE.TrackballControls( camera );

    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.minDistance = 8;
    controls.maxDistance = 15;

    //controls.noRotate = true;
    controls.noZoom = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;

    controls.keys = [ 65, 83, 68 ];
    controls.addEventListener( 'change', render );

    scene = new Physijs.Scene();
    scene.setGravity(new THREE.Vector3( 0, -30, 0 ));

    // Grid
//    let size = 14, step = 1;
//
//    let geometry = new THREE.Geometry();
//    let material = new THREE.LineBasicMaterial( { color: 0x303030 } );
//
//    for ( let i = - size; i <= size; i += step ) {
//
//        geometry.vertices.push( new THREE.Vector3( - size, - 0.04, i ) );
//        geometry.vertices.push( new THREE.Vector3(   size, - 0.04, i ) );
//
//        geometry.vertices.push( new THREE.Vector3( i, - 0.04, - size ) );
//        geometry.vertices.push( new THREE.Vector3( i, - 0.04,   size ) );
//
//    }
//
//    let line = new THREE.LineSegments( geometry, material );
//    scene.add( line );

    let base = new Physijs.PlaneMesh(
        new THREE.PlaneGeometry( 500, 500, 200, 200 ),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 }),
        0
    );
    base.rotation.x = -Math.PI / 2;
    base.receiveShadow = true;
    base.position.y = 0;
    scene.add( base );

    // Loader
    let texLoader = new THREE.TextureLoader();
    
    // Materials
    let ground_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({ map: texLoader.load( '../textures/rocks.jpg' ) }),
        .8, // high friction
        .4 // low restitution
    );
    ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
    ground_material.map.repeat.set( 3, 3 );

    // Ground
    let NoiseGen = new ImprovedNoise;

    let ground_geometry = new THREE.PlaneGeometry( 500, 500, 200, 200 );
    for ( let i = 0; i < ground_geometry.vertices.length; i++ ) {
        var vertex = ground_geometry.vertices[i];
        // ground_geometry.vertices[i].y = NoiseGen.noise( vertex.x / 5, vertex.z / 5 ) * 1;
    }
    ground_geometry.computeFaceNormals();
    ground_geometry.computeVertexNormals();

    let ground = new Physijs.HeightfieldMesh(
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

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    controls.handleResize();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    requestAnimationFrame( animate );
    controls.update();
    let dronePoint = getCameraPoint(drone);
    camera.position.x = dronePoint.x;
    camera.position.y = dronePoint.y + 3;
    camera.position.z = dronePoint.z - 10;
    camera.lookAt(dronePoint);
    render();
}

function render() {
    rotors.updateRotation();
    rotors.updatePitch();
    rotors.updateVelocity();
    scene.simulate();
    renderer.render( scene, camera );
}

function getCameraPoint(drone) {
    return new THREE.Vector3( drone.position.x, drone.position.y + 1, drone.position.z + 3 );
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
    setTimeout(handleInput, 50);
}

// attach event handler
document.onkeydown = function(event) { keysState[event.code] = true;  };
document.onkeyup   = function(event) { keysState[event.code] = false; };
