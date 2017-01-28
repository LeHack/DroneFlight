'use strict';

class Rotors {
    constructor(drone, leftRotorModel, rightRotorModel){
        this.drone      = drone;
        this.leftRotor  = leftRotorModel;
        this.rightRotor = rightRotorModel;

        this.maxPower = 60;
        this.maxPitch = 9;
        this.maxHeight = 30;
        this.maxVertVelocity = 4;
        this.pick   = {LEFT: 0, RIGHT: 1};
        this.direct = {LEFT: 0, RIGHT: 1, FORWARD: 2, BACKWARD: 3};

        this.burner = false;
        this.pitchPressed = false;
        this.leftRotorState = false;
        this.rightRotorState = false;

        this.leftRotorPower  = 1;
        this.rightRotorPower = 1;

        this.leftRotorSpeed  = 0;
        this.rightRotorSpeed = 0;

        this.leftRotorPitchCtrl = 0;
        this.rightRotorPitchCtrl = 0;

        this.leftRotorPitch = 0;
        this.rightRotorPitch = 0;
    }

    updateVelocity() {
        let leftPitch  = this._getPitchCtrl(this.pick.LEFT),
            rightPitch = this._getPitchCtrl(this.pick.RIGHT),
            leftRotorSpeed = this._getSpeed(this.pick.LEFT),
            rightRotorSpeed = this._getSpeed(this.pick.RIGHT),
            leftRotorPwr = this._getPower(this.pick.LEFT),
            rightRotorPwr = this._getPower(this.pick.RIGHT),
            linearVelocity = this.drone.getLinearVelocity(),
            angularVelocity = this.drone.getAngularVelocity();

        // get direction
        var matrix = new THREE.Matrix4();
        matrix.extractRotation( this.drone.matrix );
        var direction = new THREE.Vector3( 0, 0, 1 );
        direction.applyMatrix4(matrix);


        // Horizontal speed
        let planeIncrement = (leftPitch * leftRotorSpeed + rightPitch * rightRotorSpeed) * .001;
        if (planeIncrement !== 0) {
            linearVelocity.x += direction.x * planeIncrement;
            linearVelocity.z += direction.z * planeIncrement;
        }
        else {
            linearVelocity.x += -linearVelocity.x * .1;
            linearVelocity.z += -linearVelocity.z * .1;
        }
        let absVelX = Math.abs(linearVelocity.x),
            absVelZ = Math.abs(linearVelocity.z);
        // cap horizontal speed
        if (absVelX < 0.1)       { linearVelocity.x = 0  * (linearVelocity.x > 0 ? 1 : -1); }
        else if (absVelX > 50) { linearVelocity.x = 50 * (linearVelocity.x > 0 ? 1 : -1); }
        if (absVelZ < 0.1)       { linearVelocity.z = 0  * (linearVelocity.z > 0 ? 1 : -1); }
        else if (absVelZ > 50) { linearVelocity.z = 50 * (linearVelocity.z > 0 ? 1 : -1); }


        // Vertical speed
        let yStep = 0.01;
        if (linearVelocity.y > 0) {
            if (linearVelocity.y > this.maxVertVelocity - 1) {
                yStep = (this.maxVertVelocity - linearVelocity.y) * 0.01;
                if (linearVelocity.y > this.maxVertVelocity) {
                    yStep = 0;
                }
            }
        }
        let yIncrement = (this._vertPitchIncr(leftPitch) * leftRotorSpeed + this._vertPitchIncr(rightPitch) * rightRotorSpeed);
        if (leftRotorPwr > 0 || rightRotorPwr > 0) {
            linearVelocity.y += yStep * yIncrement;
            // cap vertical speed
            if (linearVelocity.y > 0 && this.drone.position.y > this.maxHeight - 3) {
                linearVelocity.y = linearVelocity.y * (this.maxHeight - this.drone.position.y)/3;
            }
        }

        // Horizontal turn
        let angularIncrement = (leftPitch * leftRotorSpeed - rightPitch * rightRotorSpeed) * .0001;
        if (angularIncrement !== 0) {
            angularVelocity.y += angularIncrement;
        }
        else {
            angularVelocity.y += -angularVelocity.y * 0.1;
        }


        // Vertical pitch
//        if (linearVelocity.z !== 0) {
//            let xRotIncr = linearVelocity.z * .1; // 0-5
//            this.drone.rotation.x = xRotIncr * 0.05;
//            this.drone.__dirtyRotation = true;
//        }
//        else if (Math.abs(this.drone.rotation.x) > 0) {
//            if (Math.abs(this.drone.rotation.x) < 0.01) {
//                this.drone.rotation.x = 0;
//            }
//            else {
//                this.drone.rotation.x += -this.drone.rotation.x * .1;
//            }
//            this.drone.__dirtyRotation = true;
//        }
//
//        if (linearVelocity.x !== 0) {
//            let zRotIncr = linearVelocity.x * .1; // 0-5
//            this.drone.rotation.z = zRotIncr * 0.05;
//            this.drone.__dirtyRotation = true;
//        }
//        else if (Math.abs(this.drone.rotation.z) > 0) {
//            if (Math.abs(this.drone.rotation.z) < 0.01) {
//                this.drone.rotation.z = 0;
//            }
//            else {
//                this.drone.rotation.z += -this.drone.rotation.z * .1;
//            }
//            this.drone.__dirtyRotation = true;
//        }

        // angular velocities limits
        if (Math.abs(angularVelocity.x) < 0.001) { angularVelocity.x = 0; }
        if (Math.abs(angularVelocity.z) < 0.001) { angularVelocity.z = 0; }
        if (Math.abs(angularVelocity.x) > 3) { angularVelocity.x = 3 * (angularVelocity.x > 0 ? 1 : -1); }
        if (Math.abs(angularVelocity.y) > 3) { angularVelocity.y = 3 * (angularVelocity.y > 0 ? 1 : -1); }
        if (Math.abs(angularVelocity.z) > 3) { angularVelocity.z = 3 * (angularVelocity.z > 0 ? 1 : -1); }
        
        // update
        this.drone.setLinearVelocity(linearVelocity);
        this.drone.setAngularVelocity(angularVelocity);
    }

    _vertPitchIncr(pitch) {
        return (1 - Math.abs(pitch)/(25 * this.maxPitch));
    }

    updateRotation() {
        if (this.leftRotor !== null && this.rightRotor !== null) {
            this.leftRotor.rotation.y  +=  this._calcRotorRotation(this.pick.LEFT)  * 0.01 * Math.PI;
            this.rightRotor.rotation.y += -this._calcRotorRotation(this.pick.RIGHT) * 0.01 * Math.PI;
        }
    }

    updatePitch() {
        if (this.leftRotor !== null && this.rightRotor !== null) {
            this.leftRotor.rotation.x  = this._calcRotorPitch(this.pick.LEFT);
            this.rightRotor.rotation.x = this._calcRotorPitch(this.pick.RIGHT);
        }
    }

    toggleBurner() {
        this.burner = !this.burner;
    }

    toggleRotorState(select) {
        this._setPower(select, 1);
        if (select === this.pick.LEFT) {
            this.leftRotorState  = !this.leftRotorState;
        }
        else {
            this.rightRotorState = !this.rightRotorState;
        }
    }

    accelerate(select) {
        let power =  this._getPower(select);
        if (power < this.maxPower) {
             this._setPower(select, power + 2);
        }
    }

    decelerate(select){
        let power =  this._getPower(select);
        if (power > 2) {
             this._setPower(select, power - 2);
        }
    }

    steer(direction) {
        this.pitchPressed = (direction !== undefined);
        if (!this.pitchPressed) { return; }

        let leftPitch  = this._getPitchCtrl(this.pick.LEFT),
            rightPitch = this._getPitchCtrl(this.pick.RIGHT);

        if (direction === this.direct.FORWARD) {
            if (leftPitch < this.maxPitch)
                this._setPitchCtrl(this.pick.LEFT,  this._getPitchCtrl(this.pick.LEFT)  + 3);
            if (rightPitch < this.maxPitch)
                this._setPitchCtrl(this.pick.RIGHT, this._getPitchCtrl(this.pick.RIGHT) + 3);
        }
        else if (direction === this.direct.BACKWARD) {
            if (leftPitch > -this.maxPitch)
                this._setPitchCtrl(this.pick.LEFT,  this._getPitchCtrl(this.pick.LEFT)  - 3);
            if (rightPitch > -this.maxPitch)
                this._setPitchCtrl(this.pick.RIGHT, this._getPitchCtrl(this.pick.RIGHT) - 3);
        }
        else if (direction === this.direct.LEFT) {
            if (leftPitch < this.maxPitch)
                this._setPitchCtrl(this.pick.LEFT,  this._getPitchCtrl(this.pick.LEFT)  + 3);
            if (rightPitch > -this.maxPitch)
                this._setPitchCtrl(this.pick.RIGHT, this._getPitchCtrl(this.pick.RIGHT) - 3);
        }
        else if (direction === this.direct.RIGHT) {
            if (leftPitch > -this.maxPitch)
                this._setPitchCtrl(this.pick.LEFT,  this._getPitchCtrl(this.pick.LEFT)  - 3);
            if (rightPitch < this.maxPitch)
                this._setPitchCtrl(this.pick.RIGHT, this._getPitchCtrl(this.pick.RIGHT) + 3);
        }
    }

    _calcRotorPitch(select) {
        let pitchCtrl = this._getPitchCtrl(select),
            pitch     = this._getPitch(select);

        if (pitch < pitchCtrl - .01) {
            pitch += 0.75;
        } else if (pitch > pitchCtrl + .01) {
            pitch -= 0.75;
        }
        else {
            pitch = pitchCtrl;
        }

        this._setPitch(select, pitch);
        if (!this.pitchPressed) {
            if (pitchCtrl > 0) {
                this._setPitchCtrl(select, pitchCtrl - 3);
            }
            else if (pitchCtrl < 0) {
                this._setPitchCtrl(select, pitchCtrl + 3);
            }
        }

        return pitch/100 * Math.PI;
    }

    _calcRotorRotation(select) {
        let rotorSpeed = this._getSpeed(select),
            rotorPower = this._getPower(select),
            speedStep = (rotorSpeed > 0 ? rotorSpeed/10 : .05);

        if (rotorSpeed < rotorPower - .01) {
            rotorSpeed += speedStep;
        } else if (rotorSpeed > .01 && rotorSpeed > rotorPower + .01) {
            rotorSpeed -= speedStep;
        }
        else {
            rotorSpeed = rotorPower;
        }

        this._setSpeed(select, rotorSpeed);
        return rotorSpeed;
    }

    _getPower(select) {
        let out = 0;
        if (select === this.pick.LEFT && this.leftRotorState) {
            out = (this.burner ? this.maxPower : this.leftRotorPower);
        }
        else if (select === this.pick.RIGHT && this.rightRotorState) {
            out = (this.burner ? this.maxPower : this.rightRotorPower);
        }
        return out;
    }
    _setPower(select, power){
        if (select === this.pick.LEFT && this.leftRotorState) {
            this.leftRotorPower  = power;
        }
        else if (select === this.pick.RIGHT && this.rightRotorState) {
            this.rightRotorPower = power;
        }

        if (!this.leftRotorState && !this.rightRotorState && this.burner) {
            this.burner = false;
        }
    }

    _getSpeed(select) {
        let out = null;
        if (this.__isLeft(select)) { out = this.leftRotorSpeed;  }
        else                       { out = this.rightRotorSpeed; }
        return out;
    }
    _setSpeed(select, speed){
        if (this.__isLeft(select)) { this.leftRotorSpeed  = speed; }
        else                       { this.rightRotorSpeed = speed; }
    }

    _getPitchCtrl(select) {
        let pitch = null;
        if (this.__isLeft(select)) { pitch = this.leftRotorPitchCtrl;  }
        else                       { pitch = this.rightRotorPitchCtrl; }
        return pitch;
    }
    _setPitchCtrl(select, pitch){
        if (this.__isLeft(select)) { this.leftRotorPitchCtrl  = pitch; }
        else                       { this.rightRotorPitchCtrl = pitch; }
    }

    _getPitch(select) {
        let pitch = null;
        if (this.__isLeft(select)) { pitch = this.leftRotorPitch;  }
        else                       { pitch = this.rightRotorPitch; }
        return pitch;
    }
    _setPitch(select, pitch){
        if (this.__isLeft(select)) { this.leftRotorPitch  = pitch; }
        else                       { this.rightRotorPitch = pitch; }
    }

    __isLeft(select) {
        return (select === this.pick.LEFT);
    }
};
