var camera, scene, renderer, drone, rotors;

let loader = new THREE.TGALoader();
let texture = loader.load( '../models/Drone/Drone_D.tga');
let material = new THREE.MeshPhongMaterial( {
    color: 0xffffff,
    map: texture,
    side: THREE.DoubleSide,
});

// model
loader = new THREE.OBJLoader();
loader.load( '../models/Drone/Body.obj', function ( body ) {
    body.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
            child.material = material;
        }
    });
    
    drone = body;
    drone.position.x = 0;
    drone.position.y = 1;
    drone.position.z = 0;

    loader.load( '../models/Drone/Engine.obj', function ( engine ) {
        engine.traverse( function ( child ) {
            if ( child instanceof THREE.Mesh ) {
                child.material = material;
            }
        });
        engineL = engine.clone();
        engineR = engine.clone();

        engineL.position.x = .73;
        engineL.position.y = 1.34;
        engineL.position.z = -.1;
        engineR.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));

        engineR.position.x = -.73;
        engineR.position.y = 1.34;
        engineR.position.z = -.1;
        
        init();
        
        scene.add( drone );
        scene.add( engineL );
        scene.add( engineR );

        rotors = new Rotors(engineL, engineR);
        handleInput();
        animate();
    });
});

function init() {

    let container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
    camera.position.set( 3, 3, 3 );
    camera.lookAt(drone.position);

    scene = new THREE.Scene();

    // Grid

    let size = 14, step = 1;

    let geometry = new THREE.Geometry();
    let material = new THREE.LineBasicMaterial( { color: 0x303030 } );

    for ( let i = - size; i <= size; i += step ) {

        geometry.vertices.push( new THREE.Vector3( - size, - 0.04, i ) );
        geometry.vertices.push( new THREE.Vector3(   size, - 0.04, i ) );

        geometry.vertices.push( new THREE.Vector3( i, - 0.04, - size ) );
        geometry.vertices.push( new THREE.Vector3( i, - 0.04,   size ) );

    }

    let line = new THREE.LineSegments( geometry, material );
    scene.add( line );

    let particleLight = new THREE.Mesh( new THREE.SphereGeometry( 16, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
    scene.add( particleLight );

    // Lights

    scene.add( new THREE.AmbientLight( 0xaaaaaa ) );

    let directionalLight = new THREE.DirectionalLight(/*Math.random() * 0xffffff*/0xeeeeee );
    directionalLight.position.x = 0;
    directionalLight.position.y = 1;
    directionalLight.position.z = 10;
    directionalLight.position.normalize();
    scene.add( directionalLight );

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

function render() {
    let timer = Date.now() * 0.0005;

//    camera.position.x = Math.cos(timer) * 4;
//    camera.position.y = 4;
//    camera.position.z = Math.sin(timer) * 2;

    rotors.updateRotation(timer);
    rotors.updatePitch();
    renderer.render( scene, camera );
}

let keysState = {};
let prevState = {};
let handlers = {
    "ArrowLeft":      () => { rotors.steer(rotors.direct.LEFT);     },
    "ArrowRight":     () => { rotors.steer(rotors.direct.RIGHT);    },
    "ArrowUp":        () => { rotors.steer(rotors.direct.FORWARD);  },
    "ArrowDown":      () => { rotors.steer(rotors.direct.BACKWARD); },
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
    if (!keysState["ArrowUp"] && !keysState["ArrowDown"] && !keysState["ArrowLeft"] && !keysState["ArrowRight"]) {
        rotors.steer();
    }
    setTimeout(handleInput, 50);
}

// attach event handler
document.onkeydown = function(event) { keysState[event.code] = true;  };
document.onkeyup   = function(event) { keysState[event.code] = false; };
