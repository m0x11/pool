import * as THREE from 'three';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';
import S from './sharedState';

type FoodPosition = {
    x: number;
    y: number;
}

export class Food {
    private scene: THREE.Scene = new THREE.Scene();
    private camera: any = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 1000);
    private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    private effect = new AsciiEffect(this.renderer, ' .:-+*=%@&?', { invert: true, resolution: .2, strResolution: 'low' });
    private foodPositions: FoodPosition[] = [];
    private foodInstances: THREE.InstancedMesh = new THREE.InstancedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial(), 0);
    private maxInstanceCount = 100;
    private currentInstanceCount = 0;
    private testTorus = null;

    constructor(container: HTMLElement) {
        this.camera.position.set(0, 0, 1);
        this.addLights();
        this.scale();
        this.renderer.setClearColor(0x000000, 1);
        this.effect.setSize(window.innerWidth, window.innerHeight);
        this.effect.domElement.style.color = 'white';
        this.effect.domElement.style.backgroundColor = 'RGBA(0,0,255,0)';
        this.effect.domElement.id = 'ascii';
        this.addEventListeners();
        this.createAnimationLoop();
        this.foodInstances = this.createAllTorusInstances();
        //this.createTorus(this.scene, this.camera);
        container.appendChild(this.effect.domElement);
    }

    /* 
    * SCENE FUNCTIONS *
    */
    private scale(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    private addLights(): void {
        const frontLight = new THREE.DirectionalLight(0xfff0dd, 1);
        frontLight.position.set(0, 5, 10);
        this.scene.add(frontLight);
        const backLight = new THREE.DirectionalLight(0xfff0dd, 1);
        backLight.position.set(0, 5, -10);
        this.scene.add(backLight);
        const leftLight = new THREE.DirectionalLight(0xfff0dd, 1);
        leftLight.position.set(-10, 5, 0);
        this.scene.add(leftLight);
        const rightLight = new THREE.DirectionalLight(0xfff0dd, 1);
        rightLight.position.set(10, 5, 0);
        this.scene.add(rightLight);
        const frontLight2 = new THREE.DirectionalLight(0xfff0dd, 1);
        frontLight2.position.set(0, 0, 7);
        this.scene.add(frontLight2);
    }

    private createAnimationLoop(): void {
        const dummyObject = new THREE.Object3D();
        const rotationSpeed = 0.04;
        const translationSpeed = 0.002;

        const render = (): void => {
            //this.renderer.clear()
            this.effect.render(this.scene, this.camera);
            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(render);
            dummyObject.rotation.y += rotationSpeed;


            let aliveIndex = 0;

            for (let i = 0; i < this.currentInstanceCount; i++) {
                const foodItem = this.foodPositions[i];
                foodItem.y += translationSpeed;
                const distanceToHead = new THREE.Vector2(foodItem.x, foodItem.y)
                    .distanceTo(new THREE.Vector2(S.sharedHead.x, S.sharedHead.y));
                if (distanceToHead < 0.1 || foodItem.y > 1) {
                    S.curDrop.x = foodItem.x;
                    S.curDrop.y = foodItem.y;
                    continue;
                }
                dummyObject.position.set(foodItem.x, foodItem.y, 0);
                dummyObject.scale.set(0.01, 0.04, 0.01);
                dummyObject.updateMatrix();
                this.foodInstances.setMatrixAt(aliveIndex, dummyObject.matrix);
                if (aliveIndex !== i) {
                    this.foodPositions[aliveIndex] = foodItem;
                }
                aliveIndex++;
            }
            this.currentInstanceCount = aliveIndex;
            this.foodInstances.count = aliveIndex;
            this.foodPositions.length = aliveIndex;
            this.foodInstances.instanceMatrix.needsUpdate = true;

        };
        requestAnimationFrame(render);
    }

    private addEventListeners(): void {
        window.addEventListener('resize', this.scale.bind(this));
        window.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.keyCode === 32 || event.key === ' ') {
                this.addFood(Math.random());
            }
        });
    }

    private createAllTorusInstances = (): THREE.InstancedMesh => {
        const geometry = new THREE.TorusKnotGeometry(1, .08, 10, 64);
        //(1, 0.1, 128, 64);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // ensure vertexColors is true
        /*
        material.onBeforeCompile = (shader) => {
            shader.defines.USE_INSTANCING = ''; // Ensure that the shader knows it's being used for instancing.
        };
        */
        const instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxInstanceCount);

        // Assuming -1 in Y is off-screen or a default starting position
        const dummyObject = new THREE.Object3D();
        dummyObject.scale.set(0.03, 0.03, 0.03);
        dummyObject.position.set(0, 0, 0);
        for (let i = 0; i < this.maxInstanceCount; i++) {
            dummyObject.updateMatrix();
            instancedMesh.setMatrixAt(i, dummyObject.matrix);
        }

        instancedMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(instancedMesh);
        return instancedMesh;
    }
    private addFood = (xPosition: number): void => {
        if (this.currentInstanceCount < this.maxInstanceCount) {
            const dummyObject = new THREE.Object3D();
            dummyObject.position.set(xPosition, 0, 0);
            dummyObject.scale.set(0.05, 0.03, 0.05);
            dummyObject.updateMatrix();
            this.foodInstances.setMatrixAt(this.currentInstanceCount, dummyObject.matrix);
            this.foodPositions.push({ x: xPosition, y: 0 });
            this.currentInstanceCount++;
            this.foodInstances.instanceMatrix.needsUpdate = true;
        }
    }
}