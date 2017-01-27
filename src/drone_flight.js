var container;

var camera, scene, renderer, objects;
var particleLight;
var drone, rotors;

var loader = new THREE.TGALoader();
var texture = loader.load( '../models/Drone/Drone_D.tga');
var material = new THREE.MeshPhongMaterial( {
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

        animate();
    });
});

function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
    camera.position.set( 3, 3, 3 );
    camera.lookAt(drone.position);

    scene = new THREE.Scene();

    // Grid

    var size = 14, step = 1;

    var geometry = new THREE.Geometry();
    var material = new THREE.LineBasicMaterial( { color: 0x303030 } );

    for ( var i = - size; i <= size; i += step ) {

        geometry.vertices.push( new THREE.Vector3( - size, - 0.04, i ) );
        geometry.vertices.push( new THREE.Vector3(   size, - 0.04, i ) );

        geometry.vertices.push( new THREE.Vector3( i, - 0.04, - size ) );
        geometry.vertices.push( new THREE.Vector3( i, - 0.04,   size ) );

    }

    var line = new THREE.LineSegments( geometry, material );
    scene.add( line );

    particleLight = new THREE.Mesh( new THREE.SphereGeometry( 16, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xffffff } ) );
    scene.add( particleLight );

    // Lights

    scene.add( new THREE.AmbientLight( 0xaaaaaa ) );

    var directionalLight = new THREE.DirectionalLight(/*Math.random() * 0xffffff*/0xeeeeee );
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

var clock = new THREE.Clock();

function render() {

    var timer = Date.now() * 0.0005;

//    camera.position.x = Math.cos(timer) * 4;
//    camera.position.y = 4;
//    camera.position.z = Math.sin(timer) * 2;

    rotors.updateRotation(timer);
    renderer.render( scene, camera );
}

function handleInput(event) {
    switch (event.keyCode) {
        case 107: // NumPad +
            rotors.accelerate(rotors.pick().LEFT);
            rotors.accelerate(rotors.pick().RIGHT);
            break;
        case 109: // NumPad -
            rotors.decelerate(rotors.pick().LEFT);
            rotors.decelerate(rotors.pick().RIGHT);
            break;
        case 106: // NumPad *
            rotors.toggleBurner();
            break;
        case 219: // [
            rotors.toggleRotorState(rotors.pick().LEFT);
            break;
        case 221: // ]
            rotors.toggleRotorState(rotors.pick().RIGHT);
            break;
        default:
            console.log(event.keyCode);
    }
}

// attach event handler
document.onkeydown = handleInput;
