'use strict';

Physijs.scripts.worker = './vendor/physijs_worker.js';
Physijs.scripts.ammo = './ammo.js';

var camera, cameraBox, scene, sky, renderer, controls, drone, rotors;

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

        cameraBox = new Physijs.BoxMesh(
            new THREE.BoxGeometry( .1, .1 ,.1 ),
            new THREE.MeshBasicMaterial({ wireframe: true, opacity: 0.5 })
//            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
        );
//        attachCamera( drone, cameraBox );

        rotors = new Rotors(drone, engineL, engineR);
        handleInput();

        animate();
    });
});

function init() {

    let container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000000 );
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

function attachCamera( drone, cameraBox ) {
    let constraint = new Physijs.DOFConstraint(
        drone, // First object to be constrained
        cameraBox, // OPTIONAL second object - if omitted then physijs_mesh_1 will be constrained to the scene
        new THREE.Vector3( 0, 10, -10 ) // point in the scene to apply the constraint
    );
    scene.addConstraint( constraint );
    constraint.setLinearLowerLimit( new THREE.Vector3( -10, -5, 0 ) ); // sets the lower end of the linear movement along the x, y, and z axes.
    constraint.setLinearUpperLimit( new THREE.Vector3( 10, 5, 0 ) ); // sets the upper end of the linear movement along the x, y, and z axes.
    constraint.setAngularLowerLimit( new THREE.Vector3( 0, -Math.PI/2, 0 ) ); // sets the lower end of the angular movement, in radians, along the x, y, and z axes.
    constraint.setAngularUpperLimit( new THREE.Vector3( 0, Math.PI/2, 0 ) ); // sets the upper end of the angular movement, in radians, along the x, y, and z axes.
//    constraint.configureAngularMotor(
//        which, // which angular motor to configure - 0,1,2 match x,y,z
//        low_limit, // lower limit of the motor
//        high_limit, // upper limit of the motor
//        velocity, // target velocity
//        max_force // maximum force the motor can apply
//    );
//    constraint.enableAngularMotor( which ); // which angular motor to configure - 0,1,2 match x,y,z
//    constraint.disableAngularMotor( which ); // which angular motor to configure - 0,1,2 match x,y,z}
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
    camera.position.x = dronePoint.position.x;
    camera.position.y = dronePoint.position.y;
    camera.position.z = dronePoint.position.z;
    camera.lookAt(dronePoint.lookAt);
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
    var matrix = new THREE.Matrix4();
    matrix.extractRotation( drone.matrix );
    var direction = new THREE.Vector3( 0, 0, 1 );
    direction.applyMatrix4(matrix);
    return {
        "lookAt": new THREE.Vector3(
            drone.position.x + 3*direction.x,
            (drone.position.y + 3*direction.y + .5),
            drone.position.z + 3*direction.z
        ),
        "position": new THREE.Vector3(
            (drone.position.x - 5*direction.x),
            (drone.position.y - 5*direction.y + 3),
            (drone.position.z - 5*direction.z)
        ),
    };
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
