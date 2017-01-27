var Rotors = (function() {
    
    var leftRotor = null, rightRotor = null, // 3d objects
        leftRotorPower  = 1, leftRotorSpeed  = 0,
        rightRotorPower = 1, rightRotorSpeed = 0,
        burner = false,
        leftRotorState = false, rightRotorState = false;

    function Rotors(leftRotorModel, rightRotorModel){
        leftRotor  = leftRotorModel;
        rightRotor = rightRotorModel;
    }

    var pick = {LEFT: 0, RIGHT: 1};
    Rotors.prototype.pick = function() { return pick; }

    Rotors.prototype.updateRotation = function(timer) {
        if (this.leftRotor !== null && this.rightRotor !== null) {
            leftRotor.rotation.y  =  calcRotorSpeed(pick.LEFT, timer);
            rightRotor.rotation.y = -calcRotorSpeed(pick.RIGHT, timer);
        }
    }

    Rotors.prototype.toggleBurner = function() {
        burner = !burner;
    }

    Rotors.prototype.toggleRotorState = function(select) {
        if (select === pick.LEFT) {
            leftRotorState  = !leftRotorState;
        }
        else {
            rightRotorState = !rightRotorState;
        }
    }

    Rotors.prototype.accelerate = function(select) {
        var power = getPower(select);
        if (power < 100) {
            setPower(select, power + 1);
        }
    }

    Rotors.prototype.decelerate = function(select){
        var power = getPower(select);
        if (power > 1) {
            setPower(select, power - 1);
        }
    }

    function calcRotorSpeed(select, timer) {
        var rotorSpeed = getSpeed(select),
            rotorPower = getPower(select);

        if (rotorSpeed < rotorPower - .01) {
            rotorSpeed += .5;
        } else if (rotorSpeed > .01 && rotorSpeed > rotorPower + .01) {
            rotorSpeed -= .5;
        }
        else {
            rotorSpeed = rotorPower;
        }

        setSpeed(select, rotorSpeed);
        return rotorSpeed * timer * Math.PI;
    }

    function getPower(select) {
        var out = 0;
        if (select === pick.LEFT && leftRotorState) {
            out = (burner ? 100 : leftRotorPower);
        }
        else if (select === pick.RIGHT && rightRotorState) {
            out = (burner ? 100 : rightRotorPower);
        }
        return out;
    }
    function setPower(select, power){
        if (select === pick.LEFT && leftRotorState) {
            leftRotorPower  = power;
        }
        else if (select === pick.RIGHT && rightRotorState) {
            rightRotorPower = power;
        }

        if (burner) {
            burner = false;
        }
    }

    function getSpeed(select) {
        var out = null;
        if (select === pick.LEFT) { out = leftRotorSpeed;  }
        else                      { out = rightRotorSpeed; }
        return out;
    }
    function setSpeed(select, speed){
        if (select === pick.LEFT) { leftRotorSpeed  = speed; }
        else                      { rightRotorSpeed = speed; }
    }

    return Rotors;
})();
