import * as THREE from 'three';
import { Fish } from './inverse';
//import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import S from './sharedState';

type Point = { x: number, y: number };

export class Pool {

    private scene: THREE.Scene = new THREE.Scene();
    private camera: any = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 1000);
    private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });


    private renderScene: RenderPass = {} as RenderPass;
    private bloomComposer: EffectComposer = {} as EffectComposer;
    private finalComposer: EffectComposer = {} as EffectComposer;
    private bloomPass: UnrealBloomPass = {} as UnrealBloomPass;
    private shaderPass: ShaderPass = {} as ShaderPass;
    private outputPass: OutputPass = {} as OutputPass;


    private BLOOM_SCENE = 1;
    private bloomLayer = new THREE.Layers();
    private darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    private materials = {};


    /*
    private bloomPass: UnrealBloomPass;
    private bloomComposer: EffectComposer;
    private mixPass: ShaderPass;
    //private outputPass: OutputPass;
    private finalComposer: EffectComposer;
*/

    private plane: THREE.Mesh = new THREE.Mesh();
    private bufferRead = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.FloatType, minFilter: THREE.NearestMipMapNearestFilter });
    private bufferWrite = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.FloatType, minFilter: THREE.NearestMipMapNearestFilter });

    //private env = new THREE.TextureLoader().load('src/env/tiles.jpg');
    private env = new THREE.TextureLoader().load('src/env/organic.png');
    private noise = new THREE.TextureLoader().load('src/env/noise.png');
    private tiles = new THREE.TextureLoader().load('src/env/pool.png');

    private moon = { x: 0, y: 0, z: 0 };
    private drop = { x: 0, y: 0 };

    // Head + Tail
    private soul = null;
    private soulScale = -0.016;
    private tail = null;
    private tailScale = 0.026;

    // Spikes
    private spikeInstances: any = {};
    private spikesScale = -0.022;
    private spikeFrequency = 4;
    private skip = 14;

    // Spine
    private numBones = 180;
    private targetPositions: THREE.Vector3[] = Array.from({ length: this.numBones / this.spikeFrequency }, () => new THREE.Vector3());
    private targetRotations: THREE.Quaternion[] = Array.from({ length: this.numBones / this.spikeFrequency }, () => new THREE.Quaternion());

    private lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    private lineGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array((this.numBones + 1) * 3), 3));
    private lineSegments = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);

    private excitation = 1000;
    private whisker1Material = new THREE.LineBasicMaterial({ color: 0xffffff });
    private whisker1Geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array((this.excitation) * 3), 3));
    private whisker1Segments = new THREE.LineSegments(this.whisker1Geometry, this.whisker1Material);

    private whisker2Material = new THREE.LineBasicMaterial({ color: 0xffffff });
    private whisker2Geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array((this.excitation) * 3), 3));
    private whisker2Segments = new THREE.LineSegments(this.whisker2Geometry, this.whisker2Material);
    private aspect = window.innerWidth / window.innerHeight;


    // Uniforms
    private uniforms: any = {
        u_time: { type: "f", value: 1.0 },
        u_resolution: { type: "v2", value: new THREE.Vector2() },
        u_noise: { type: "t", value: this.noise },
        u_buffer: { type: "t", value: this.bufferWrite.texture },
        u_texture: { type: "t", value: this.tiles },
        u_environment: { type: "t", value: this.env },
        u_moon: { type: "v3", value: new THREE.Vector3() },
        u_frame: { type: "i", value: -1. },
        u_renderpass: { type: 'b', value: false },
        u_drop: { type: 'v3', value: new THREE.Vector3() },
    };

    private leftCowl: Point = { x: 0, y: 0 };
    private rightCowl: Point = { x: 0, y: 0 };
    private sleeping = true;

    // Birth
    private ENDOLITH: Fish;
    constructor(container: HTMLElement) {
        this.camera.position.set(0, 0, 1);
        this.addLights();

        this.createPlane();
        this.env.wrapS = THREE.RepeatWrapping;
        this.env.wrapT = THREE.RepeatWrapping;
        this.env.minFilter = THREE.NearestMipMapNearestFilter;
        this.noise.wrapS = THREE.RepeatWrapping;
        this.noise.wrapT = THREE.RepeatWrapping;
        this.noise.minFilter = THREE.LinearFilter;
        this.tiles.wrapS = THREE.RepeatWrapping;
        this.tiles.wrapT = THREE.RepeatWrapping;
        //this.tiles.wrapS = THREE.ClampToEdgeWrapping;
        //this.tiles.wrapT = THREE.ClampToEdgeWrapping;

        this.tiles.minFilter = THREE.NearestMipMapNearestFilter

        this.createSpine();
        this.createSoul();
        this.createTail();
        this.createSpikeInstances();
        this.addEventListeners();
        this.createWhiskers();

        const terrarium = this.renderer.domElement;
        const fish0x0000 = new Fish({ x: 0, y: 0 }, this.numBones, terrarium, 6, 1, 1, 0);
        this.ENDOLITH = fish0x0000;
        fish0x0000.birth();
        fish0x0000.sleep();

        container.appendChild(this.renderer.domElement);
        this.initComposer();
        this.scale();
        this.createAnimationLoop();
    }

    private live(): void {
        this.ENDOLITH.live();
        this.sleeping = false;
    }

    /* 
       * SCENE FUNCTIONS *
    */
    private scale(): void {
        this.aspect = window.innerWidth / window.innerHeight;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = this.aspect;
        this.camera.updateProjectionMatrix();
        this.plane.scale.set(window.innerWidth, window.innerHeight, 1);
        this.uniforms.u_resolution.value.x = this.renderer.domElement.width;
        this.uniforms.u_resolution.value.y = this.renderer.domElement.height;
        this.bufferWrite = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.bufferRead = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.bloomComposer.setSize(window.innerWidth, window.innerHeight);
        this.finalComposer.setSize(window.innerWidth, window.innerHeight);
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

    private initComposer(): void {

        this.scene.traverse(this.disposeMaterial.bind(this));
        this.bloomLayer.set(this.BLOOM_SCENE);

        // this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        //this.renderer.toneMappingExposure = 1;
        this.renderScene = new RenderPass(this.scene, this.camera);




        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0, 0, 0);
        this.bloomPass.threshold = 0;
        this.bloomPass.strength = .7;
        this.bloomPass.radius = .6;

        this.bloomComposer = new EffectComposer(this.renderer);
        this.bloomComposer.renderToScreen = false;
        this.bloomComposer.addPass(this.renderScene);
        this.bloomComposer.addPass(this.bloomPass);

        //this.renderer.shadowMap.enabled = true;
        //this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        //this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.shaderPass = new ShaderPass(
            new THREE.ShaderMaterial({
                uniforms: {
                    baseTexture: { value: null },
                    bloomTexture: { value: this.bloomComposer.renderTarget2.texture }
                },
                vertexShader: 'varying vec2 vUv;void main() {vUv = uv;gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );}',
                fragmentShader: 'uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main() {gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 0.5 ) * texture2D( bloomTexture, vUv ) );}',
                defines: {}
            }), 'baseTexture'
        );
        this.shaderPass.needsSwap = true;

        this.outputPass = new OutputPass();

        this.finalComposer = new EffectComposer(this.renderer);
        this.finalComposer.addPass(this.renderScene);
        this.finalComposer.addPass(this.shaderPass);
        this.finalComposer.addPass(this.outputPass);
    }

    private disposeMaterial(obj): void {
        if (obj.material) {
            obj.material.dispose();
        }
    }

    private darkenMaterial(obj): void {
        if (obj.isMesh && this.bloomLayer.test(obj.layers) === false) {
            this.materials[obj.uuid] = obj.material;
            obj.material = this.darkMaterial;
        }
    }

    private restoreMaterial(obj) {
        if (this.materials[obj.uuid]) {
            obj.material = this.materials[obj.uuid];
            delete this.materials[obj.uuid];
        }
    }

    private async shade(): Promise<THREE.ShaderMaterial> {
        const vsh = await fetch('src/shaders/water.glsl');
        const fsh = await fetch('src/shaders/ripple.glsl');
        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: await vsh.text(),
            fragmentShader: await fsh.text()
        });
        return material;
    }

    private async createPlane(): Promise<void> {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = await this.shade();
        this.plane = new THREE.Mesh(geometry, material);
        this.plane.position.set(0.5, 0.5, 0);
        this.plane.scale.set(1, 1, 1);
        this.scene.add(this.plane);
    }

    private ripple(): void {
        const odims = this.uniforms.u_resolution.value.clone();
        this.uniforms.u_resolution.value.x = window.innerWidth;
        this.uniforms.u_resolution.value.y = window.innerHeight;
        this.uniforms.u_renderpass.value = true;
        this.uniforms.u_buffer.value = this.bufferRead.texture;  // Read from bufferRead
        this.renderer.setRenderTarget(this.bufferWrite);  // Write into bufferWrite
        this.renderer.render(this.scene, this.camera, this.bufferWrite, true);

        // Swap the buffers
        let t = this.bufferWrite;
        this.bufferWrite = this.bufferRead;
        this.bufferRead = t;

        this.uniforms.u_resolution.value = odims;
        this.uniforms.u_renderpass.value = false;
    }

    private createAnimationLoop(): void {
        const render = (): void => {

            //this.renderer.clear();
            this.uniforms.u_frame.value++;
            this.uniforms.u_time.value = this.uniforms.u_frame.value * 0.0001;

            this.ripple();

            this.drawBones(this.ENDOLITH.wake());
            this.drawSpikes(this.ENDOLITH.wake());

            S.sharedHead = { x: this.ENDOLITH.head.x / window.innerWidth, y: (window.innerHeight - this.ENDOLITH.head.y) / window.innerHeight };
            const leftCowl = this.leftCowl;
            const rightCowl = this.rightCowl;
            this.W1.illuminate(this.whisker1Geometry);
            //this.whisker1Geometry.attributes.position.z = 0;
            //this.whisker2Geometry.attributes.position.z = 0;
            if (!isNaN(leftCowl.x) && !isNaN(leftCowl.y)) {
                this.W1.attach({ x: leftCowl.x, y: leftCowl.y });
            }
            this.W2.illuminate(this.whisker2Geometry);
            if (!isNaN(rightCowl.x) && !isNaN(rightCowl.y)) {
                this.W2.attach({ x: rightCowl.x, y: rightCowl.y });
            }
            if (this.sleeping) {
                this.ENDOLITH.breathe();
            }

            this.renderer.setRenderTarget(null);
            this.renderer.setClearAlpha(0.0);

            //this.renderer.render(this.scene, this.camera);
            this.scene.traverse(this.darkenMaterial.bind(this));

            //this.camera.layers.set(this.BLOOM_SCENE);
            this.bloomComposer.render();
            //this.camera.layers.set(0);
            this.scene.traverse(this.restoreMaterial.bind(this));

            if ((S.curDrop.x !== 0 || S.curDrop.y !== 0) && this.drop != S.curDrop) {
                this.drop = S.curDrop;
                this.drip(this.drop.x, this.drop.y);
            }
            //this.ENDOLITH.setInterest(S.closestFood);

            this.finalComposer.render();
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    private addEventListeners(): void {
        window.addEventListener('resize', this.scale.bind(this));
        window.addEventListener('click', this.live.bind(this));
        window.addEventListener('mousemove', this.mousemove.bind(this));
    }

    private drip = (x: number, y: number) => {
        const newX = x * 2 - 1;
        const newY = y * 2 - 1;
        this.uniforms.u_drop.value.x = newX / 2;
        this.uniforms.u_drop.value.y = newY / 2;
        this.uniforms.u_drop.value.z = 1;

        setTimeout(() => {
            this.uniforms.u_drop.value.z = 0;
            this.drop = { x: 0, y: 0 };
            S.curDrop = { x: 0, y: 0 };
        }, 80);
    }

    private mousemove = (e: MouseEvent) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        // scale by window size:


        const newX = x * 2 - 1;
        const newY = 1 - (y * 2 - 1);
        this.uniforms.u_moon.value.x = newX / 2;
        this.uniforms.u_moon.value.y = newY / 2;
        this.uniforms.u_moon.value.z = 1;
        this.moon = { x: newX, y: newY, z: 1 };
    }

    /* 
        * FISH FUNCTIONS *
    */
    private async createSpine(): Promise<void> {
        //this.scene.add(this.lineSegments);
    }

    private W1: Fish;
    private W2: Fish;
    private async createWhiskers(): Promise<void> {
        const whisker1Messanger = new Fish({ x: 0, y: 0 }, this.excitation, this.renderer.domElement, 1, 0, 1, 0.1);
        this.W1 = whisker1Messanger;
        this.W1.birth();
        this.W1.live();
        this.scene.add(this.whisker1Segments);
        const whisker2Messanger = new Fish({ x: 0, y: 0 }, this.excitation, this.renderer.domElement, 1, 0, 1, -0.1);
        this.W2 = whisker2Messanger;
        this.W2.birth();
        this.W2.live();
        this.scene.add(this.whisker2Segments);
    }

    private async createSoul(): Promise<void> {
        const loader = new OBJLoader();
        const material = new THREE.MeshPhysicalMaterial({
            roughness: 0,
            metalness: 1,
        });
        loader.load('/src/assets/@.obj', (obj: any) => {
            obj.position.set(.5, .5, -.2);
            obj.rotation.set(1.5, 0, 0);
            this.soul = obj;
            obj.scale.set(this.soulScale, this.soulScale, this.soulScale);
            obj.traverse(function (child: any) {
                if (child.isMesh) {
                    child.material = material;
                }
            }.bind(this));

            this.scene.add(obj);

            this.soul?.layers.enable(this.BLOOM_SCENE);
            this.soul?.children[0].layers.enable(this.BLOOM_SCENE);

        });

    }

    private async createTail(): Promise<void> {
        const loader = new OBJLoader();
        const material = new THREE.MeshPhysicalMaterial({
            roughness: .2,
            metalness: 1,
        });
        loader.load('/src/assets/petal{}.obj', (obj: any) => {
            obj.position.set(.5, .5, -.2);
            obj.rotation.set(0, 0, 0);
            this.tail = obj;
            //this.tail?.layers.set(0);
            obj.scale.set(this.tailScale, this.tailScale, this.tailScale);
            obj.traverse(function (child: any) {
                if (child.isMesh) {
                    child.material = material;
                }
            });
            obj.layers.toggle(this.BLOOM_SCENE);
            obj.children[0].layers.toggle(this.BLOOM_SCENE);
            this.scene.add(obj);
        });
    }

    private async createSpikeInstances(): Promise<void> {
        const loader = new OBJLoader();
        const material = new THREE.MeshPhysicalMaterial({
            roughness: .1,
            metalness: 1,
        });
        loader.load('/src/assets/{{.obj', (obj: any) => {

            obj.traverse((child: any) => {
                if (child instanceof THREE.Mesh) {
                    const geometry = child.geometry;
                    this.spikeInstances = new THREE.InstancedMesh(
                        geometry,
                        material,
                        this.numBones / this.spikeFrequency// Here, 'this' refers to the instance of the class
                    );
                    const scale = new THREE.Vector3(this.spikesScale); // Scale factor of 2
                    const position = new THREE.Vector3(0.5, 0.5, 0); // Set position to 0, 0, 0
                    const rotation = new THREE.Euler(0, 0, 0); // Set rotation to 0, 0, 0
                    const quaternion = new THREE.Quaternion().setFromEuler(rotation); // Convert Euler to Quaternion

                    for (let i = 0; i < this.numBones / this.spikeFrequency; i++) {
                        const matrix = new THREE.Matrix4();
                        matrix.compose(position, quaternion, scale);
                        this.spikeInstances.setMatrixAt(i, matrix);
                    }
                    this.scene.add(this.spikeInstances);
                    this.spikeInstances.layers.enable(this.BLOOM_SCENE);
                }
            });
        },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('An error occurred:', error);
            }
        );
    }

    private instanceMatrix: THREE.Matrix4 = new THREE.Matrix4();
    private leftmostPoint: THREE.Vector3 = new THREE.Vector3();
    private returnVector: THREE.Vector3 = new THREE.Vector3();

    private getSpikeEdge(instanceIndex: number, start: number): THREE.Vector3 {
        if (this.spikeInstances && this.spikeInstances.count > 0) {
            this.spikeInstances.getMatrixAt(instanceIndex, this.instanceMatrix);
            let geometry = this.spikeInstances.geometry;
            if (geometry instanceof THREE.BufferGeometry) {
                const positions = geometry.attributes.position.array;
                this.leftmostPoint.set(positions[start], positions[start + 1], positions[start + 2]).applyMatrix4(this.instanceMatrix);
                this.returnVector.copy(this.leftmostPoint);
                return this.returnVector;
            }
        }
        return this.returnVector;
    }

    private returnVector2: THREE.Vector2 = new THREE.Vector2();
    private toScreenPosition(pos3D: THREE.Vector3, camera: THREE.Camera, canvas: HTMLCanvasElement): THREE.Vector2 {
        let pos2D = pos3D.clone().project(camera);
        this.returnVector2.set(
            (pos2D.x * 0.5 + 0.5) * canvas.width,
            (pos2D.y * -0.5 + 0.5) * canvas.height
        );
        return this.returnVector2;
    }

    private spikeInstanceMatrix: THREE.Matrix4 = new THREE.Matrix4();
    private currentScale: THREE.Vector3 = new THREE.Vector3();

    private updateSpikeInstances(): void {
        if (this.spikeInstances && this.spikeInstances.count > 0) {
            for (let i = 0; i < this.targetPositions.length; i++) {
                const targetPosition = this.targetPositions[i];
                const targetRotation = this.targetRotations[i];
                if (targetPosition.x === 0 && targetPosition.y === 0) {
                    continue;
                }
                let linear_scale = this.spikesScale * -1;
                if (i === 4) {
                    linear_scale = this.spikesScale * -1 + 0.005;
                    //let leftmostPoint = this.getSpikeEdge(i, 351);
                    let leftmostPoint = this.getSpikeEdge(i, 18);


                    let leftmostPointScaled = this.toScreenPosition(leftmostPoint, this.camera, this.renderer.domElement);
                    this.leftCowl.x = leftmostPointScaled.x;
                    this.leftCowl.y = leftmostPointScaled.y;
                    // needs z change
                    //let rightmostPoint = this.getSpikeEdge(i, 7352);
                    let rightmostPoint = this.getSpikeEdge(i, 7353);
                    let rightmostPointScaled = this.toScreenPosition(rightmostPoint, this.camera, this.renderer.domElement);
                    this.rightCowl.x = rightmostPointScaled.x;
                    this.rightCowl.y = rightmostPointScaled.y;
                }
                this.currentScale.set(linear_scale, linear_scale, linear_scale);
                this.spikeInstanceMatrix.compose(targetPosition, targetRotation, this.currentScale);
                this.spikeInstances.setMatrixAt(i, this.spikeInstanceMatrix);
                this.spikeInstances.instanceMatrix.needsUpdate = true;

            }
        }
    }

    private position: THREE.Vector3 = new THREE.Vector3();
    private quaternion: THREE.Quaternion = new THREE.Quaternion();
    private axis: THREE.Vector3 = new THREE.Vector3(0, 0, 1);

    private drawSpikes(bones: any): void {
        if (this.spikeInstances) {
            for (let i = this.spikeFrequency; i < bones.length; i += this.spikeFrequency) {
                if (i < this.skip) {
                    continue;
                }
                const instanceIndex = i / this.spikeFrequency;
                const bone = bones[i];
                this.position.set(
                    bone.origin.x / window.innerWidth,
                    (window.innerHeight - bone.origin.y) / window.innerHeight,
                    0.5 - 0.01 * instanceIndex
                );
                const prevBone = bones[i - 1];
                const prevX = prevBone.origin.x / window.innerWidth;
                const prevY = (window.innerHeight - prevBone.origin.y) / window.innerHeight;
                const deltaX = this.position.x - prevX;
                const deltaY = this.position.y - prevY;
                let angle = Math.atan2(deltaY, deltaX)
                this.quaternion.setFromAxisAngle(this.axis, angle + Math.PI);
                this.targetPositions[instanceIndex].copy(this.position);
                this.targetRotations[instanceIndex].copy(this.quaternion);
            }
            this.updateSpikeInstances();
        }
    }

    private drawBones(bones: any) {
        const positions = this.lineGeometry.getAttribute('position').array as Float32Array;
        for (let i = 0, j = 0; i < bones.length; i++, j += 3) {
            const bone = bones[i];
            if (bone && bone.origin) {
                positions[j] = bone.origin.x / window.innerWidth;
                positions[j + 1] = (window.innerHeight - bone.origin.y) / window.innerHeight;
            }
            positions[j + 2] = .5;
            if (i === 0) {
                continue;
            }
            const prevBone = bones[i - 1];
            const prevX = prevBone.origin.x / window.innerWidth;
            const prevY = (window.innerHeight - prevBone.origin.y) / window.innerHeight;
            const deltaX = positions[j] - prevX;
            const deltaY = positions[j + 1] - prevY;
            const angle = Math.atan2(deltaY, deltaX);
            if (i === 1 && this.soul) {
                this.soul.position.set(positions[j], positions[j + 1], .5);
                this.soul.rotation.set(0, 0, angle - (Math.PI / 2 + 0.1));
            }
            if (i === bones.length - 7 && this.tail) {
                this.tail.position.set(positions[j], positions[j + 1], .1);
                this.tail.rotation.set(0, 0, angle);
            }
        }
        this.lineGeometry.getAttribute('position').needsUpdate = true;
    }
}

