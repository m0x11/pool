/*
       9ca4
    e       f             ce47  7fa6     
   dd       53             bc    90
  42bbb   773f82a529e66695231903d451f                         
   0d       a6
    0       4   
       2626
*/

// ()[]{}<>!@#$%^&*|\/?.,;:~`'"`-_=+


/*
    Drift
    Angular Momentum
*/

declare const SimplexNoise: any;
const PI = 3.14159265358979;
const simplex = new SimplexNoise();

let torque = 0;
const TAU = 2 * Math.PI;

type Point = { x: number, y: number };

function lerp(start: number, end: number, amt: number) {
    return (1 - amt) * start + amt * end;
}


function perp(dx: number, dy: number): { dx: number, dy: number } {
    return { dx: -dy, dy: dx };
}

export class Bone {
    public end: Point;
    constructor(public origin: Point, public proporition: number, public index: number, public seed: number, public weight: number) {
        this.origin = origin;
        this.end = origin;
        this.proporition = proporition
        this.index = index;
        this.seed = seed;
        this.weight = weight;
    }

    follow(leader: Point, lifespan: number, velocity: number, angleOffset: number = 0.0) {

        const noiseRatio = 0.05 * (velocity / 100);

        //const noiseRatio = 0.1;

        //const noiseRatio = .1;

        const noise = simplex.noise3D(
            (this.index / 2 + this.origin.x + this.seed) * 0.005,
            (this.index / 2 + this.origin.y + this.seed) * 0.005,
            (this.index / 2 + lifespan / 2 + this.seed) * 0.005
        ) * noiseRatio * this.seed;

        /*
                const noise = simplex.noise3D(
                    lifespan * this.index / 1000,
                    lifespan * this.index / 1000,
                    lifespan * this.index / 1000
                ) * this.seed * 0.1;
        */


        /*
            const noise = simplex.noise3D(
                (lifespan + (1 + this.origin.x) * 10) * 0.005,
                (lifespan + (1 + this.origin.y) * 10) * 0.005,
                (lifespan + (1 + this.origin.x + this.origin.y) * 10) * 0.005,
            ) * noiseRatio * this.seed;
            */


        this.origin.x = lerp(this.origin.x, leader.x, this.weight);
        this.origin.y = lerp(this.origin.y, leader.y, this.weight);

        const momentary = this.calculateCoordinates(this.end, this.origin, this.proporition, noise, angleOffset);
        this.end = { x: momentary.x, y: momentary.y };
    }

    calculateCoordinates(point1: Point, point2: Point, distance: number, noise: number, angleOffset: number = 0.0) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        //const angle = Math.atan2(dy, dx) + noise + angleOffset;
        //const angle = Math.atan2(dy, dx) + angleOffset;
        let angle = Math.atan2(dy, dx) + angleOffset //+ noise;
        const x = point2.x - Math.cos(angle) * distance;
        const y = point2.y - Math.sin(angle) * distance;
        return { x: x, y: y };
    }
}

export class Fish {

    anatomy: Bone[];
    lifespan: number;
    interest: Point;
    velocity: number;
    angularVelocity: number;
    strength: number;
    head: Point;
    headRight: Point;
    headLeft: Point;
    cowlRight: Point;
    cowlLeft: Point;
    tail: Point;
    cycles: number;

    constructor(public origin: Point, public vertebrae: number, public terrarium: HTMLCanvasElement, public proportions: number, public seed: number = 0, public weight: number = 1, public angleOffset: number = 0.0) {
        this.origin = origin;
        this.vertebrae = vertebrae;
        this.terrarium = terrarium;
        this.proportions = proportions;
        this.anatomy = [];
        this.lifespan = Math.floor(Math.abs(simplex.noise2D(Math.random() * 1000, Math.random() * 1000)) * Math.random() * 2000)
        this.interest = { x: 0, y: 0 };
        this.head = { x: 0, y: 0 };
        this.tail = { x: 0, y: 0 };
        this.headRight = { x: 0, y: 0 };
        this.headLeft = { x: 0, y: 0 };
        this.cowlRight = { x: 0, y: 0 };
        this.cowlLeft = { x: 0, y: 0 };

        this.angularVelocity = 0;
        this.angleOffset = angleOffset;
        // Appel de la fonction une première fois pour définir la taille initiale de la canvas
        this.newWorld();
        this.velocity = 0;
        this.strength = 0.05;
        this.weight = weight;
        this.cycles = 0;
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    newWorld() {
        this.terrarium.width = window.innerWidth;
        this.terrarium.height = window.innerHeight;
    }

    //window.addEventListener("resize", resizeCanvas);

    birth() {
        for (let i = 0; i < this.vertebrae; i++) {
            const vertebra = new Bone({ x: this.origin.x + this.proportions * i, y: this.origin.y + this.proportions * i }, this.proportions, i, this.seed, this.weight);
            this.anatomy.push(vertebra)
        }
    }

    illuminate(geometry: any) {
        const positions = geometry.getAttribute('position').array as Float32Array;
        for (let i = 0, j = 0; i < this.anatomy.length; i++, j += 3) {
            const bone = this.anatomy[i];
            if (bone && bone.origin) {
                positions[j] = bone.origin.x / window.innerWidth;
                positions[j + 1] = (window.innerHeight - bone.origin.y) / window.innerHeight;
            }
            positions[j + 2] = .5;
        }
        geometry.getAttribute('position').needsUpdate = true;
    }


    wake() {
        return this.anatomy;
    }

    setInterest(interest: Point) {
        interest.x = interest.x * window.innerWidth;
        interest.y = interest.y * window.innerHeight;
        this.interest = { x: Math.min(interest.x, window.innerWidth), y: Math.min(interest.y, window.innerHeight) };
    }

    swim(perfect: boolean) {
        /*
        const prevInterest = { x: this.interest.x, y: this.interest.y };
        this.anatomy[0].follow({ x: this.interest.x, y: this.interest.y }, this.lifespan);
        const dx = this.interest.x - prevInterest.x;
        const dy = this.interest.y - prevInterest.y;
        const angle = Math.atan2(dy, dx);
        this.angularVelocity = angle;
        torque = angle;
        */
        this.velocity = Math.abs(this.interest.x - this.anatomy[0].origin.x) + Math.abs(this.interest.y - this.anatomy[0].origin.y)
        this.head.x = this.anatomy[0].origin.x;
        this.head.y = this.anatomy[0].origin.y;

        // Calculate the body vector

        // put the whiskers attached to a glowing rib at the top of the fish
        let bodyVector = {
            dx: this.anatomy[10].origin.x - this.head.x,
            dy: this.anatomy[10].origin.y - this.head.y
        };

        // Normalize the body vector
        let bodyLength = Math.sqrt(bodyVector.dx ** 2 + bodyVector.dy ** 2);
        bodyVector.dx /= bodyLength;
        bodyVector.dy /= bodyLength;

        // Calculate the perpendicular vector
        let perpendicularVector = perp(bodyVector.dx, bodyVector.dy);

        // Now you can calculate the positions to the right and left of the fish head
        // You might want to adjust the scalar value to get the desired distance
        let rightPosition = {
            x: this.head.x + perpendicularVector.dx * 20,  // replace 50 with desired distance
            y: this.head.y + perpendicularVector.dy * 20
        };

        let leftPosition = {
            x: this.head.x - perpendicularVector.dx * 20,  // replace 50 with desired distance
            y: this.head.y - perpendicularVector.dy * 20
        };

        this.headRight.x = rightPosition.x;
        this.headRight.y = rightPosition.y;

        this.headLeft.x = leftPosition.x;
        this.headLeft.y = leftPosition.y;


        const cowl = { x: this.anatomy[8].origin.x, y: this.anatomy[8].origin.y };

        let cowlVector = {
            dx: this.anatomy[12].origin.x - cowl.x,
            dy: this.anatomy[12].origin.y - cowl.y,
        };

        cowlVector.dx /= bodyLength;
        cowlVector.dy /= bodyLength;

        let perpendicularCowl = perp(cowlVector.dx, cowlVector.dy);

        // Now you can calculate the positions to the right and left of the fish head
        // You might want to adjust the scalar value to get the desired distance
        let cowlRightPosition = {
            x: cowl.x + perpendicularCowl.dx * 0,  // replace 50 with desired distance
            y: cowl.y + perpendicularCowl.dy * 0
        };

        let cowlLeftPosition = {
            x: cowl.x - perpendicularCowl.dx * 0,  // replace 50 with desired distance
            y: cowl.y - perpendicularCowl.dy * 0
        };

        this.cowlRight.x = cowlRightPosition.x;
        this.cowlRight.y = cowlRightPosition.y;

        this.cowlLeft.x = cowlLeftPosition.x;
        this.cowlLeft.y = cowlLeftPosition.y;



        if (perfect) {
            this.anatomy[0].follow({ x: this.interest.x, y: this.interest.y }, this.lifespan, this.velocity);
        } else {
            var distractX = lerp(this.head.x, this.interest.x, this.strength * 0.5);
            var distractY = lerp(this.head.y, this.interest.y, this.strength * 0.5);
            this.anatomy[0].follow({ x: distractX, y: distractY }, this.lifespan, this.velocity);
        }


        for (let i = 1; i < this.vertebrae; i++) {
            this.anatomy[i].follow({ x: this.anatomy[i - 1].end.x, y: this.anatomy[i - 1].end.y }, this.lifespan, this.velocity, this.angleOffset);
            if (i == this.vertebrae - 1) {
                this.tail.x = this.anatomy[i].end.x;
                this.tail.y = this.anatomy[i].end.y;
            }
        }
    }

    sleep() {
        this.anatomy[0].origin.x = window.innerWidth / 2;
        this.anatomy[0].origin.y = window.innerHeight / 2;
        for (let i = 1; i < this.vertebrae; i++) {

            const j = this.vertebrae - i;
            const angle = ((j / 55) ** 1.618);
            const leader = { x: this.anatomy[i - 1].end.x, y: this.anatomy[i - 1].end.y };
            this.anatomy[i].origin.x = lerp(this.anatomy[i].origin.x, leader.x, this.anatomy[i].weight);
            this.anatomy[i].origin.y = lerp(this.anatomy[i].origin.y, leader.y, this.anatomy[i].weight);

            const momentary = this.anatomy[i].calculateCoordinates(this.anatomy[i].end, this.anatomy[i].origin, this.anatomy[i].proporition, 0, angle);
            this.anatomy[i].end = { x: momentary.x, y: momentary.y };
        }
    }

    breathe() {
        this.cycles += 0.25;
        // types: 
        // 1. expand and contract segments
        // 2. expand and contract segments, but with a delay
        // 3. expand and contract fins (pool)
        // 4. light and dark (pool)

        const factor = Math.sin(this.cycles / 10) / 100
        for (let i = 1; i < this.vertebrae; i++) {
            const leader = { x: this.anatomy[i - 1].end.x, y: this.anatomy[i - 1].end.y };
            this.anatomy[i].origin.x = lerp(this.anatomy[i].origin.x, leader.x, this.anatomy[i].weight);
            this.anatomy[i].origin.y = lerp(this.anatomy[i].origin.y, leader.y, this.anatomy[i].weight);

            const momentary = this.anatomy[i].calculateCoordinates(this.anatomy[i].end, this.anatomy[i].origin, (factor * (i / 10) + factor * 5) + this.anatomy[i].proporition, 0, 0);
            this.anatomy[i].end = { x: momentary.x, y: momentary.y };
        }

    }

    rise() {
        console.log('rise');
    }

    updateTarget() {
        let t = simplex.noise3D(
            this.interest.x * 0.0015,
            this.interest.y * 0.0015,
            this.lifespan * 0.0015
        ) * TAU * 100;

        //t = 1;

        this.interest.x = lerp(
            this.interest.x,
            //this.interest.x + 20 * (Math.cos(t) + Math.cos(this.lifespan * 0.05)),
            this.interest.x,
            //this.interest.x + t + 20 * (Math.cos(this.lifespan * 0.05)),
            this.strength
        );

        this.interest.y = lerp(
            this.interest.y,
            //this.interest.y + 20 * (Math.cos(t) + Math.cos(this.lifespan * 0.05)),
            this.interest.y,
            //this.interest.y + t + 20 * (Math.cos(this.lifespan * 0.05)),
            this.strength
        );

        /*
        if (
            this.head.x > window.innerWidth + 500 ||
            this.head.x < -500 ||
            this.head.y > window.innerHeight + 500 ||
            this.head.y < -500
        ) {
            this.interest.x = Math.random() * window.innerWidth
            this.interest.y = Math.random() * window.innerHeight
        }
        */
    }

    attach(newInterest: Point) {
        this.interest = newInterest;
        this.swim(true);
        this.lifespan += 1;
        //this.updateTarget();
    }

    handleMouseMove(event: MouseEvent) {
        this.interest = { x: event.clientX, y: event.clientY };
    }

    live() {
        this.swim(false);
        this.lifespan += 1;
        this.updateTarget();
        requestAnimationFrame(this.live.bind(this));
    }
}
