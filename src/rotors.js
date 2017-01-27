class Rotors {
    constructor(leftRotorModel, rightRotorModel){
        this.leftRotor  = leftRotorModel;
        this.rightRotor = rightRotorModel;

        this.maxPower = 60;
        this.maxPitch = 9;
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
             this._setPower(select, power + 1);
        }
    }

    decelerate(select){
        let power =  this._getPower(select);
        if (power > 1) {
             this._setPower(select, power - 1);
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
