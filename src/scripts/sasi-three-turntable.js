import * as THREE from "three";

const root = document.querySelector("[data-sasi-three]");

if (root) {
  const playgroundRoot = root.closest("[data-ascii-playground]");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.02, 8.2);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  root.append(renderer.domElement);

  const object = new THREE.Group();
  object.rotation.set(-0.36, -0.48, -0.1);
  scene.add(object);

  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(2.8, 3.5, 4.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xd8d8c8, 1.15);
  fill.position.set(-3.8, 1.4, 2.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 1.8);
  rim.position.set(-1.6, 1.8, -4.5);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0xffffff, 0.62));

  const frontMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8f3d8,
    metalness: 0.05,
    roughness: 0.48,
    side: THREE.DoubleSide
  });
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0x57554b,
    metalness: 0.08,
    roughness: 0.68,
    side: THREE.DoubleSide
  });

  const bodyShape = new THREE.Shape();
  bodyShape.absellipse(0, 0, 1.0, 1.12, 0, Math.PI * 2, false, 0);

  const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.035,
    bevelSegments: 8,
    curveSegments: 112
  });
  bodyGeometry.center();

  const body = new THREE.Mesh(bodyGeometry, [frontMaterial, sideMaterial]);
  body.scale.set(1.2, 1.22, 1);
  object.add(body);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load("/sasi-source.svg", (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const artMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const art = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 3.38), artMaterial);
    art.position.set(0.04, -0.03, 0.235);
    object.add(art);

    playgroundRoot?.classList.add("has-sasi-three");
    render();
  });

  const resize = () => {
    const rect = root.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  };

  const render = () => {
    renderer.render(scene, camera);
  };

  new ResizeObserver(resize).observe(root);
  resize();
  render();
}
