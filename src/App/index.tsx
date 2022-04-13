import React, { useRef, useEffect, RefObject } from 'react';
import styles from './index.module.scss';
import {
  Mesh, Scene, WebGLRenderer, PlaneBufferGeometry, PerspectiveCamera, TextureLoader,
  DirectionalLight, MeshPhongMaterial, Vector2, HemisphereLight, Group, RepeatWrapping, Raycaster, Object3D, Material,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class World {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private timer = 0;
  private renderer: WebGLRenderer;
  private texLoader = new TextureLoader();
  private gltfLoader = new GLTFLoader();
  private control: OrbitControls;
  private chair: Group | null = null;
  private raycaster = new Raycaster();
  private mouse = new Vector2();
  private target: Object3D | null = null;
  private tempMaterial: Material | null = null;
  private selectedMaterial = new MeshPhongMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
  constructor(container: HTMLDivElement) {
    const { offsetWidth: width, offsetHeight: height } = container;
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height);
    container.append(this.renderer.domElement);
    this.scene = new Scene();

    this.camera = this.initCamera(width / height);
    this.control = this.initControl();
    this.initLights();
    this.initObjs();
    this.loadModel('chair.glb');
  }
  private initControl = () => {
    const control = new OrbitControls(this.camera, this.renderer.domElement);
    control.maxDistance = 5;
    control.minDistance = 2;
    control.enableDamping = true;
    control.target.set(0, 0.5, 0);
    return control;
  }
  private initCamera = (aspect: number) => {
    const camera = new PerspectiveCamera(50, aspect, 0.1, 1000);
    camera.position.set(-3, 3, -3);
    return camera;
  }
  private loadModel = (url: string) => {
    this.gltfLoader.loadAsync(url)
      .then(obj => {
        console.log(obj.scene)
        obj.scene.traverse(o => {
          o.castShadow = true;
          o.receiveShadow = true;
        })
        this.chair = obj.scene;
        this.scene.add(obj.scene);
      })
      .catch(error => console.log(error))
  }
  private initObjs = () => {
    const planeGeo = new PlaneBufferGeometry(1000, 1000);
    const planeMat = new MeshPhongMaterial({ color: 0xeeeeee });
    const plane = new Mesh(planeGeo, planeMat);
    plane.rotateX(-Math.PI / 2);
    plane.receiveShadow = true;
    this.scene.add(plane);
  }
  private initLights = () => {
    const hemiLight = new HemisphereLight();
    hemiLight.intensity = 1;
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);
    const directionLight = new DirectionalLight(0xffffff, 0.1);
    directionLight.position.set(-5, 12, -5);
    directionLight.castShadow = true;
    directionLight.shadow.mapSize = new Vector2(1024, 1024);
    this.scene.add(directionLight);
  }
  public updateTexture = (url: string) => {
    this.texLoader.loadAsync(url)
      .then(texture => {
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;

        let isUpated = false;
        this.target?.traverse(obj => {
          if (obj instanceof Mesh) {
            if (!isUpated) {
              this.tempMaterial = new MeshPhongMaterial({
                map: texture,
              });
              isUpated = true;
            }
            obj.material = new MeshPhongMaterial({
              map: texture,
            })
          }
        })
      })
  }
  public draw = () => {
    this.control.update();
    this.renderer.render(this.scene, this.camera);
    this.timer = requestAnimationFrame(this.draw);
  }
  public mousemove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { clientWidth, clientHeight } = this.renderer.domElement;
    this.mouse.set(
      (clientX / clientWidth) * 2 - 1,
      -(clientY / clientHeight) * 2 + 1,
    )
  }
  private restoreMaterial = () => {
    if (this.target && this.tempMaterial) {
      (this.target as Mesh).material = this.tempMaterial;
    }
  }
  public click = () => {
    if (!this.chair) {
      return;
    }
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = this.raycaster.intersectObjects(this.chair.children);
    if (!intersection.length) {
      this.restoreMaterial();
      this.target = null;
      return;
    }
    const [target] = intersection;
    this.restoreMaterial();
    this.target = target.object;
    this.tempMaterial = (this.target as Mesh).material as Material;
    (this.target as Mesh).material = this.selectedMaterial;
  }
  public dispose = () => {
    cancelAnimationFrame(this.timer);
  }
}

const resources = [
  'img/denim_.jpg',
  'img/fabric_.jpg',
  'img/pattern_.jpg',
  'img/quilt_.jpg',
  'img/wood_.jpg',
]

type Props = {
  world: RefObject<World | undefined>;
}
const Options = ({ world }: Props) => {
  const click = (url: string) => {
    world.current?.updateTexture(url);
  }
  return <div className={styles.options}>
    {resources.map(url =>
      <img
        key={url}
        alt='img'
        src={url}
        className={styles.img}
        onClick={() => click(url)}
      />
    )}
  </div>
}

export const App = () => {
  const ref = useRef<HTMLDivElement>(null);
  const refWorld = useRef<World>();
  useEffect(() => {
    if (!ref.current) { return }
    const container = ref.current;
    refWorld.current = new World(container);
    refWorld.current.draw();
    return () => refWorld.current?.dispose();
  }, [ref])

  return <div className={styles.root}>
    <div
      ref={ref}
      className={styles.container}
      onClick={() => refWorld.current?.click()}
      onMouseMove={e => refWorld.current?.mousemove(e)}
    />
    <Options world={refWorld} />
  </div>
}