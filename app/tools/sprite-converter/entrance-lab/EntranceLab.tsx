'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as avatarFactory from '@/lib/city/models/gustavAvatar';
import { createGustavAvatar, skinnedBounds, type AvatarRig, type AvatarStage, type AvatarBinding } from '@/lib/city/models/gustavAvatarRig';
import * as avatarHarness from '@/lib/city/models/gustavAvatarHarness';
import * as workshop from '@/lib/city/models/workshop';
import * as hqAvatar from '@/lib/city/models/legoHqAvatar';
import * as valtech from '@/lib/city/models/valtechOffice';
import * as stadium from '@/lib/city/models/aarhusStadium';
import { createStadionhallFlagModel } from '@/lib/city/models/stadionHallStates';
import * as burgerTrailer from '@/lib/city/models/cateItBurger';
import * as harbourLibrary from '@/lib/city/models/harbourLibrary';
import * as cityBike from '@/lib/city/models/cityBike';
import * as pizzaTrailer from '@/lib/city/models/cateItPizza';
import * as streetFoodTrailer from '@/lib/city/models/cateItAfrican';
import { createCateItSquareModel, createSquareMeal, squarePlanToModel, SEATS, BENCH_TOP, type Signs, type Truck } from '@/lib/city/models/cateItSquareStates';
import { createLEGOHQAvatarRoofOnModel, createLEGOHQAvatarRoofOffModel, createLEGOHQAvatarDoorModel, createLEGOHQAvatarMomentModel, type CampusView } from '@/lib/city/models/legoHqAvatarStates';
import { createValtechOfficeRoofOnModel, createValtechOfficeRoofOffModel } from '@/lib/city/models/valtechOfficeStates';
import { poseAvatarSit, standAvatar } from '@/lib/city/models/gustavAvatarSit';

// Review/test bench for the img2threejs reconstructions (?model=hqAvatar|hqAvatarOpen|hqAvatarDoor|avatar|workshop).
// Generation sources live in art/img2threejs/. The avatar models are in wu (0.9 wu tall). Avatar-only options:
// clip ('idle' | 'walk' | 'walk-in-place'), t (seconds), and URL params stage / binding (see gustavAvatarRig.ts).
// One page session renders every view through window.__shoot(name, options), so textures
// load once and every capture shares them:
//   view: 'reference' (front, elevated, framed like the model's aerial crop) | 'iso' (converter camera)
//         | 'sprite' (exactly what /tools/sprite-converter exports: its normalisation, camera and size)
//   zoom / voff: sprite-converter zoom and vertical offset (LEGO HQ sprites: 1.0 / 0.31, 384 px)
//   focusNode: sprite view only, aim the converter camera at this runtime node (zoomed door-moment shots)
//   pitch: sprite view camera pitch in degrees (converter: 35.26 true iso; the 2:1 city grid implies 30)
//   yaw: iso yaw in degrees (45 / -45) · fit: crop iso to the model · elev: reference elevation
//   rig: 'lookdev' (generator rig) | 'photo' (sun placed from the photo's shadows) | 'converter' (sprite converter, transparent bg)
//   bg: hex background for lookdev · stripped: flat base colours · open: 0..1 door slide
//   exposure: lookdev tone-mapping exposure (match the photo's exposure)
//   tone: lookdev tone mapping, 'aces' (generator default) | 'neutral' (keeps saturated product colours, like a photo)

type ModelConfig = {
  name: string;
  create: (options: { castShadow?: boolean; receiveShadow?: boolean }) => THREE.Group;
  lights: (mode: 'reference') => THREE.Object3D;
  environment: (renderer: THREE.WebGLRenderer) => THREE.Texture;
  configure: (renderer: THREE.WebGLRenderer) => void;
  // Sliding leaves: node id -> direction along X, and full travel in model units
  leaves: Record<string, number>;
  travel: number;
  // Reference framing: output size, ortho half-width and look-at target matching the aerial crop
  reference: { width: number; height: number; halfW: number; target: [number, number, number] };
  // Optional eye-height perspective for the 'reference' view, for references that are ground photos
  eye?: { fov: number; position: [number, number, number]; target: [number, number, number] };
  // Sun position read off the reference photo's cast shadows (for the 'photo' rig)
  sun?: { position: [number, number, number]; intensity: number };
  // Sprite view: normalise from the rest-pose bounds captured at load (animated models must not re-frame per pose)
  restBounds?: boolean;
};

// Flag wave phase for the red hall's ambient loop: ?flag=<0..1>
const FLAG_PHASE = () => Number(new URLSearchParams(window.location.search).get('flag') ?? 0);

const AVATAR_PARAMS = () => {
  const p = new URLSearchParams(window.location.search);
  return {
    stage: (p.get('stage') as AvatarStage) ?? 'bound',
    binding: (p.get('binding') as AvatarBinding) ?? 'transfer',
    laptop: p.get('laptop') !== '0',
  };
};

// The avatar with the LEGO HQ at avatar scale (both in wu): on the plaza in front of the main door (roof on) or in
// the lobby (roof off); the avatarAt option moves it to any plan point. Plan tile (gx, gy) -> model (gx - 7.5, gy - 5.5)
// on the 15 x 11 plot; the plot top is at y = 0.06.
const HQ_PLAN = { w: 15, h: 11 };
function avatarHqScene(open: boolean): THREE.Group {
  const group = new THREE.Group();
  const building = open ? createLEGOHQAvatarRoofOffModel({ castShadow: true, receiveShadow: true }) : createLEGOHQAvatarRoofOnModel({ castShadow: true, receiveShadow: true });
  const avatar = createGustavAvatar({ ...AVATAR_PARAMS(), castShadow: true });
  group.add(building, avatar);
  const [x, y] = open ? [8.5, 5.5] : [8.5, 10.6];
  avatar.position.set(x - HQ_PLAN.w / 2, 0.06, y - HQ_PLAN.h / 2);
  if (open) avatar.rotation.y = -Math.PI / 4;
  group.userData.avatar = avatar.userData.avatar;
  group.userData.avatarGroup = avatar;
  group.userData.plan = HQ_PLAN;
  return group;
}

// The avatar with the Valtech office (both in wu): on the approach tile in front of the gate (roof on), or inside at
// the desk's stand tile (roof off); the avatarAt option moves it to any plan point. Plan tile (lx, ly) -> model
// (lx - 3, ly - 1) on the 6 x 2 plot; the floor top is at y = 0.05.
const VALTECH_PLAN = { w: 6, h: 2 };
function avatarValtechScene(open: boolean): THREE.Group {
  const group = new THREE.Group();
  const options = { castShadow: true, receiveShadow: true };
  const building = open ? createValtechOfficeRoofOffModel(options) : createValtechOfficeRoofOnModel(options);
  const avatar = createGustavAvatar({ ...AVATAR_PARAMS(), castShadow: true });
  group.add(building, avatar);
  const [x, y] = open ? [4.5, 1.5] : [5.5, 2.5];
  avatar.position.set(x - VALTECH_PLAN.w / 2, open ? 0.05 : 0.04, y - VALTECH_PLAN.h / 2);
  if (open) avatar.rotation.y = -Math.PI / 4;
  group.userData.avatar = avatar.userData.avatar;
  group.userData.avatarGroup = avatar;
  group.userData.plan = VALTECH_PLAN;
  return group;
}

// The avatar on the plaza in front of the new Aarhus stadium (both in wu): on the south side, by the glass band at the
// facade line, so the 0.9 wu avatar reads against the 2.6 wu roof edge (art/img2threejs/aarhus-stadium, POR-36).
function avatarStadiumScene(): THREE.Group {
  const group = new THREE.Group();
  const building = stadium.createAarhusStadiumModel({ castShadow: true, receiveShadow: true });
  const avatar = createGustavAvatar({ ...AVATAR_PARAMS(), castShadow: true });
  group.add(building, avatar);
  avatar.position.set(0.6, 0.04, 2.15);
  group.userData.avatar = avatar.userData.avatar;
  group.userData.avatarGroup = avatar;
  return group;
}

// The avatar on the plaza at the foot of the harbour library's west stair flight (both in wu), so the 0.9 wu avatar reads against
// the 1.2 wu deck and the 3.0 wu roof (art/img2threejs/harbour-library, POR-49). ?ax=&az= move it for scale tries.
function avatarHarbourLibraryScene(): THREE.Group {
  const q = new URLSearchParams(window.location.search);
  const group = new THREE.Group();
  const building = harbourLibrary.createHarbourLibraryModel({ castShadow: true, receiveShadow: true });
  const avatar = createGustavAvatar({ ...AVATAR_PARAMS(), castShadow: true });
  group.add(building, avatar);
  avatar.position.set(Number(q.get('ax') ?? -2.5), 0.08, Number(q.get('az') ?? 3.4));
  group.userData.avatar = avatar.userData.avatar;
  group.userData.avatarGroup = avatar;
  group.userData.boundsFrom = building;
  return group;
}

// The avatar at the burger trailer's hatch (both in wu): on the serving side (+Z, south), in front of the counter, so the
// 0.9 wu avatar reads against the 0.76 wu counter and the 1.5 wu body top (art/img2threejs/cate-it-burger, POR-38).
// ?ax=&az=&ayaw= (degrees) move and turn the avatar for scale tries.
function avatarBurgerScene(create = burgerTrailer.createBurgerTrailerModel): THREE.Group {
  const q = new URLSearchParams(window.location.search);
  const group = new THREE.Group();
  const building = create({ castShadow: true, receiveShadow: true });
  const avatar = createGustavAvatar({ ...AVATAR_PARAMS(), castShadow: true });
  group.add(building, avatar);
  avatar.position.set(Number(q.get('ax') ?? 0.35), 0.02, Number(q.get('az') ?? 0.78));
  avatar.rotation.y = (Number(q.get('ayaw') ?? 0) * Math.PI) / 180;
  group.userData.avatar = avatar.userData.avatar;
  group.userData.avatarGroup = avatar;
  return group;
}

// The city bike (art/img2threejs/bike-velorbis) with the avatar standing beside it, both in wu, for the scale check.
// ?ax=&az=&ayaw= (degrees) move and turn the avatar.
function avatarCityBikeScene(): THREE.Group {
  const q = new URLSearchParams(window.location.search);
  const group = new THREE.Group();
  const bike = cityBike.createCityBikeModel({ castShadow: true, receiveShadow: true });
  const avatar = createGustavAvatar({ ...AVATAR_PARAMS(), castShadow: true });
  group.add(bike, avatar);
  avatar.position.set(Number(q.get('ax') ?? -0.05), 0, Number(q.get('az') ?? -0.32));
  avatar.rotation.y = (Number(q.get('ayaw') ?? 0) * Math.PI) / 180;
  group.userData.avatar = avatar.userData.avatar;
  group.userData.avatarGroup = avatar;
  group.userData.boundsFrom = bike;
  return group;
}

// The food truck square (8 x 7) with the avatar seated at one truck's seat (?seat=burger|pizza|african), its meal in front:
// framed by the square alone, so it lines up with the square's sprite (the city swaps to it while the avatar sits there).
function cateItSquareSeatedScene(): THREE.Group {
  const truck = (new URLSearchParams(window.location.search).get('seat') ?? 'burger') as Truck;
  const [x, z] = squarePlanToModel(SEATS[truck]);
  const group = new THREE.Group();
  const square = createCateItSquareModel({ castShadow: true, receiveShadow: true });
  const avatar = createGustavAvatar({ ...AVATAR_PARAMS(), castShadow: true });
  avatar.position.set(x, 0.02, z);
  poseAvatarSit(avatar.userData.avatar as AvatarRig, 0.02 + BENCH_TOP);
  const meal = createSquareMeal(truck, { castShadow: true });
  meal.position.set(x, 0, z + 0.22);
  group.add(square, avatar, meal);
  group.userData.boundsFrom = square;
  return group;
}

// The stadium site: the 8 x 5 stadium with the red hall (4 x 2, with its flag) on its south side as the entrance, centred
// on the stadium's entrance link (x 0), and the avatar at the hall's main door; the site is 8 x 7 wu.
function stadiumSiteScene(): THREE.Group {
  const group = new THREE.Group();
  const options = { castShadow: true, receiveShadow: true };
  const arena = stadium.createAarhusStadiumModel(options);
  arena.position.z = -1;
  const hall = createStadionhallFlagModel(options, FLAG_PHASE());
  hall.position.set(Number(new URLSearchParams(window.location.search).get('hallx') ?? 0), 0, 2.5);   // ?hallx= for size tries
  const avatar = createGustavAvatar({ ...AVATAR_PARAMS(), castShadow: true });
  avatar.position.set(0.55, 0.04, 3.75);
  group.add(arena, hall, avatar);
  group.userData.avatar = avatar.userData.avatar;
  group.userData.avatarGroup = avatar;
  return group;
}

// The roof-off building with the avatar seated at a beat's chair (lib/city/interiorBeats.ts seat), framed by the building
// alone so the render lines up pixel for pixel with the roof-off sprite: the city swaps to it while the avatar sits.
// Chair point in plan tiles, turn in degrees (180 = facing north), seat top in wu above the floor.
function valtechSeatedScene(at: [number, number], yawDeg: number, seatTop: number): THREE.Group {
  const group = new THREE.Group();
  const building = createValtechOfficeRoofOffModel({ castShadow: true, receiveShadow: true });
  const avatar = createGustavAvatar({ ...AVATAR_PARAMS(), castShadow: true });
  group.add(building, avatar);
  avatar.position.set(at[0] - VALTECH_PLAN.w / 2, 0.05, at[1] - VALTECH_PLAN.h / 2);
  avatar.rotation.y = THREE.MathUtils.degToRad(yawDeg);
  const rig = avatar.userData.avatar as AvatarRig;
  poseAvatarSit(rig, seatTop);
  group.userData.boundsFrom = building;
  return group;
}

const valtechOpen = (view: CampusView): ModelConfig => ({
  name: `Valtech office (roof off, ${view} view)`,
  create: (options) => createValtechOfficeRoofOffModel(options, view),
  lights: valtech.createValtechOfficeLookDevLights,
  environment: valtech.createValtechOfficeEnvironment,
  configure: valtech.configureValtechOfficeRenderer,
  leaves: {},
  travel: 0,
  reference: { width: 384, height: 384, halfW: 3.0, target: [0, 0, 0] },
});

const MODELS: Record<string, ModelConfig> = {
  // Gustav's city avatar (img2threejs + character plugin), 0.9 wu tall, feet on y = 0, facing +Z
  avatar: {
    name: 'Gustav avatar',
    create: (options) => createGustavAvatar({ ...AVATAR_PARAMS(), ...options }),
    lights: avatarFactory.createGustavAvatarLookDevLights,
    environment: avatarFactory.createGustavAvatarEnvironment,
    configure: avatarFactory.configureGustavAvatarRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 300, height: 720, halfW: 0.21, target: [0, 0.45, 0] },
    restBounds: true,
  },
  // Cut-away workshop room (art/img2threejs/workshop); reference = phone photo from the door end
  workshop: {
    name: 'Workshop',
    create: workshop.createWorkshopModel,
    lights: workshop.createWorkshopLookDevLights,
    environment: workshop.createWorkshopEnvironment,
    configure: workshop.configureWorkshopRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 900, height: 1200, halfW: 1.2, target: [0, 0.6, 0] },
    eye: { fov: 84, position: [0.15, 0.86, 1.25], target: [-0.05, 0.62, -1.0] },
  },
  // LEGO HQ rebuilt at avatar scale (art/img2threejs/lego-hq-avatar, board 529:3604): roof on, and roof off per sprite view
  hqAvatar: {
    name: 'LEGO HQ at avatar scale (roof on)',
    create: createLEGOHQAvatarRoofOnModel,
    lights: hqAvatar.createLEGOHQAvatarScaleLookDevLights,
    environment: hqAvatar.createLEGOHQAvatarScaleEnvironment,
    configure: hqAvatar.configureLEGOHQAvatarScaleRenderer,
    leaves: { 'door-leaf-left': -1, 'door-leaf-right': 1 },
    travel: 0.45,
    reference: { width: 384, height: 384, halfW: 4.8, target: [0, 0, 0] },
  },
  hqAvatarOpen: {
    name: 'LEGO HQ at avatar scale (roof off, south view)',
    create: (options) => createLEGOHQAvatarRoofOffModel(options, 'south' as CampusView),
    lights: hqAvatar.createLEGOHQAvatarScaleLookDevLights,
    environment: hqAvatar.createLEGOHQAvatarScaleEnvironment,
    configure: hqAvatar.configureLEGOHQAvatarScaleRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 4.8, target: [0, 0, 0] },

    restBounds: true,   // masks/only shots keep the full model's framing
  },
  hqAvatarOpenWest: {
    name: 'LEGO HQ at avatar scale (roof off, west view)',
    create: (options) => createLEGOHQAvatarRoofOffModel(options, 'west' as CampusView),
    lights: hqAvatar.createLEGOHQAvatarScaleLookDevLights,
    environment: hqAvatar.createLEGOHQAvatarScaleEnvironment,
    configure: hqAvatar.configureLEGOHQAvatarScaleRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 4.8, target: [0, 0, 0] },
  },
  hqAvatarOpenNorth: {
    name: 'LEGO HQ at avatar scale (roof off, north view)',
    create: (options) => createLEGOHQAvatarRoofOffModel(options, 'north' as CampusView),
    lights: hqAvatar.createLEGOHQAvatarScaleLookDevLights,
    environment: hqAvatar.createLEGOHQAvatarScaleEnvironment,
    configure: hqAvatar.configureLEGOHQAvatarScaleRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 4.8, target: [0, 0, 0] },
  },
  hqAvatarOpenEast: {
    name: 'LEGO HQ at avatar scale (roof off, east view)',
    create: (options) => createLEGOHQAvatarRoofOffModel(options, 'east' as CampusView),
    lights: hqAvatar.createLEGOHQAvatarScaleLookDevLights,
    environment: hqAvatar.createLEGOHQAvatarScaleEnvironment,
    configure: hqAvatar.configureLEGOHQAvatarScaleRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 4.8, target: [0, 0, 0] },
  },
  'avatar-hq': {
    name: 'Gustav avatar at the LEGO HQ main door (avatar scale)',
    create: () => avatarHqScene(false),
    lights: hqAvatar.createLEGOHQAvatarScaleLookDevLights,
    environment: hqAvatar.createLEGOHQAvatarScaleEnvironment,
    configure: hqAvatar.configureLEGOHQAvatarScaleRenderer,
    leaves: { 'door-leaf-left': -1, 'door-leaf-right': 1 },
    travel: 0.45,
    reference: { width: 384, height: 384, halfW: 4.8, target: [0, 0, 0] },
    restBounds: true,
  },
  'avatar-hq-open': {
    name: 'Gustav avatar in the LEGO HQ lobby (roof off)',
    create: () => avatarHqScene(true),
    lights: hqAvatar.createLEGOHQAvatarScaleLookDevLights,
    environment: hqAvatar.createLEGOHQAvatarScaleEnvironment,
    configure: hqAvatar.configureLEGOHQAvatarScaleRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 4.8, target: [0, 0, 0] },
    restBounds: true,
  },
  // Valtech office (art/img2threejs/valtech-office, Linear POR-35): 6 x 2 footprint, banded louvre block; roof on, and
  // roof off per sprite view (street-level interior grey box), and with the avatar at the gate / inside
  valtech: {
    name: 'Valtech office',
    create: createValtechOfficeRoofOnModel,
    lights: valtech.createValtechOfficeLookDevLights,
    environment: valtech.createValtechOfficeEnvironment,
    configure: valtech.configureValtechOfficeRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 3.0, target: [0, 0, 0] },
  },
  valtechOpen: valtechOpen('south'),
  valtechOpenWest: valtechOpen('west'),
  valtechOpenNorth: valtechOpen('north'),
  valtechOpenEast: valtechOpen('east'),
  'avatar-valtech': {
    ...valtechOpen('south'),
    name: 'Gustav avatar at the Valtech office gate (roof on)',
    create: () => avatarValtechScene(false),
    restBounds: true,
  },
  'avatar-valtech-open': {
    ...valtechOpen('south'),
    name: 'Gustav avatar inside the Valtech office (roof off)',
    create: () => avatarValtechScene(true),
    restBounds: true,
  },
  // New Aarhus stadium (art/img2threejs/aarhus-stadium, Linear POR-36): 8 x 5 footprint
  stadium: {
    name: 'Aarhus stadium',
    create: stadium.createAarhusStadiumModel,
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 3.6, target: [0, 0, 0] },
  },
  'avatar-stadium': {
    name: 'Gustav avatar in front of the Aarhus stadium',
    create: () => avatarStadiumScene(),
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 3.6, target: [0, 0, 0] },
    restBounds: true,
  },
  // Stadionhallerne, the red heritage hall in front of the stadium (art/img2threejs/stadium-hall): 4 x 2 footprint
  stadiumHall: {
    name: 'Stadionhallerne (red hall, with its flag at ?flag=<0..1>)',
    create: (options) => createStadionhallFlagModel(options, FLAG_PHASE()),
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 2.4, target: [0, 0, 0] },
  },
  // Harbour library (art/img2threejs/harbour-library, Linear POR-49): 7 x 7 footprint
  harbourLibrary: {
    name: 'Harbour library',
    create: harbourLibrary.createHarbourLibraryModel,
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 3.6, target: [0, 0, 0] },
  },
  'avatar-harbour-library': {
    name: 'Gustav avatar at the harbour library stair',
    create: () => avatarHarbourLibraryScene(),
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 3.6, target: [0, 0, 0] },
    restBounds: true,
  },
  // City bike (art/img2threejs/bike-velorbis): a 1 x 1 prop, alone and beside the avatar
  cityBike: {
    name: 'City bike',
    create: cityBike.createCityBikeModel,
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 1024, height: 1024, halfW: 0.62, target: [0, 0.3, 0] },
  },
  'avatar-city-bike': {
    name: 'Gustav avatar beside the city bike',
    create: () => avatarCityBikeScene(),
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 1024, height: 1024, halfW: 0.62, target: [0, 0.35, 0] },
    restBounds: true,
  },
  // Burger trailer for the food truck square (art/img2threejs/cate-it-burger, Linear POR-38): 4 x 2 footprint
  cateItBurger: {
    name: 'Burger trailer',
    create: burgerTrailer.createBurgerTrailerModel,
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 2.4, target: [0, 0, 0] },
  },
  'avatar-cate-burger': {
    name: 'Gustav avatar at the burger trailer hatch',
    create: () => avatarBurgerScene(),
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 2.4, target: [0, 0, 0] },
    restBounds: true,
  },
  // Pizza trailer (art/img2threejs/cate-it-pizza: the burger trailer's spec with TRAILER=pizza), alone and with the avatar
  cateItPizza: {
    name: 'Pizza trailer',
    create: pizzaTrailer.createPizzaTrailerModel,
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 2.4, target: [0, 0, 0] },
  },
  'avatar-cate-pizza': {
    name: 'Gustav avatar at the pizza trailer hatch',
    create: () => avatarBurgerScene(pizzaTrailer.createPizzaTrailerModel),
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 2.4, target: [0, 0, 0] },
    restBounds: true,
  },
  // African street food trailer (art/img2threejs/cate-it-african: the burger trailer's spec with TRAILER=african)
  cateItAfrican: {
    name: 'African street food trailer',
    create: streetFoodTrailer.createStreetFoodTrailerModel,
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 2.4, target: [0, 0, 0] },
  },
  'avatar-cate-african': {
    name: 'Gustav avatar at the street food trailer hatch',
    create: () => avatarBurgerScene(streetFoodTrailer.createStreetFoodTrailerModel),
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 2.4, target: [0, 0, 0] },
    restBounds: true,
  },
  // The food truck square for the city (8 x 7: the three trailers, four beer tables, guests) and its seated frames
  cateItSquare: {
    name: 'Food truck square',
    // ?t= guests' loop phase, ?signs=logo|food|blank, ?lights=1 the night lights pass, ?twinkle=1 its second frame
    create: (options) => {
      const q = new URLSearchParams(window.location.search);
      const cook = q.get('cook') as Truck | null;   // ?cook=<truck>&cf=<frame>: a cook's reaction frame
      return createCateItSquareModel(options, Number(q.get('t') ?? 0), (q.get('signs') ?? 'food') as Signs, q.get('lights') === '1',
        Number(q.get('twinkle') ?? 0), cook ? { truck: cook, frame: Number(q.get('cf') ?? 0) } : null);
    },
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 4.6, target: [0, 0, 0] },
  },
  cateItSquareSit: {
    name: 'Food truck square, avatar seated (?seat=burger|pizza|african)',
    create: () => cateItSquareSeatedScene(),
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 4.6, target: [0, 0, 0] },
    restBounds: true,
  },
  'stadium-site': {
    name: 'Aarhus stadium with the red hall and the avatar',
    create: () => stadiumSiteScene(),
    lights: stadium.createAarhusStadiumLookDevLights,
    environment: stadium.createAarhusStadiumEnvironment,
    configure: stadium.configureAarhusStadiumRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 4.6, target: [0, 0, 0] },
    restBounds: true,
  },
  // The desk beat's seated moment (the Valtech chair: plan (4.72, 0.74), turned 12.6 deg off north, seat top 0.24 wu)
  'valtech-open-sit-desk': {
    ...valtechOpen('south'),
    name: 'Valtech office, roof off, avatar seated at the desk',
    create: () => valtechSeatedScene([4.72, 0.74], 167.4, 0.24),
  },
  // Moment frames for the city animations: ?model=hqAvatarMoment&moment=<0..7> (test room), &clip=<0..7> (team screen), &map=<0..7> (map wall), &ai=<0..7> (AI lab screen)
  hqAvatarMoment: {
    name: 'LEGO HQ at avatar scale (roof off, test room moment frame)',
    create: (options) => {
      const q = new URLSearchParams(window.location.search);
      return createLEGOHQAvatarMomentModel(options, Number(q.get('moment') ?? 0), Number(q.get('clip') ?? 0), Number(q.get('map') ?? 0), Number(q.get('ai') ?? 0));
    },
    lights: hqAvatar.createLEGOHQAvatarScaleLookDevLights,
    environment: hqAvatar.createLEGOHQAvatarScaleEnvironment,
    configure: hqAvatar.configureLEGOHQAvatarScaleRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 4.8, target: [0, 0, 0] },
  },
  // Door frames for the city animation: ?model=hqAvatarDoor&door=<0..1>
  hqAvatarDoor: {
    name: 'LEGO HQ at avatar scale (door frame)',
    create: (options) => createLEGOHQAvatarDoorModel(options, Number(new URLSearchParams(window.location.search).get('door') ?? 0)),
    lights: hqAvatar.createLEGOHQAvatarScaleLookDevLights,
    environment: hqAvatar.createLEGOHQAvatarScaleEnvironment,
    configure: hqAvatar.configureLEGOHQAvatarScaleRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 4.8, target: [0, 0, 0] },
  },
};

export type ShotOptions = {
  view?: 'reference' | 'iso' | 'sprite';
  zoom?: number;
  voff?: number;
  focusNode?: string;
  aim?: [number, number]; // sprite view: ground point (model x, z, unscaled) placed at the frame's horizontal centre (non-square footprints: the front corner)
  pitch?: number;
  yaw?: number;
  fit?: boolean;
  elev?: number;
  rig?: 'lookdev' | 'photo' | 'converter';
  shadow?: boolean; // converter rig: add a soft shadow light from screen upper left (baked-light look of the Krea sprites)
  bg?: string;
  stripped?: boolean;
  open?: number;
  size?: number;
  exposure?: number;
  tone?: 'aces' | 'neutral';
  clip?: string;
  t?: number;
  spin?: number; // turntable: model yaw in degrees (reference / sprite views)
  follow?: boolean; // reference view: keep the avatar's hips over the origin (root-motion clips)
  avatarAt?: [number, number]; // models with a plan (userData.plan): stand the avatar on plan point (lx, ly) in tiles
  sit?: number; // avatar models: the seated pose, hips on a seat this high (wu above the avatar's floor)
  avatarYaw?: number; // models with a plan: the avatar's turn in degrees
  masks?: string[]; // flat-colour mask render: entry i (node-id prefixes joined by '|') -> rgb(255, 8 * (i + 1), 0), avatar rgb(0, 0, 255), rest grey; glass left out
  only?: string[]; // draw only the nodes with these id prefixes ('avatar' = the avatar), e.g. one prop's full silhouette
  glow?: string; // night window pass: nodes whose id matches this regex drawn flat warm, every other mesh only hides what is behind it (transparent bg)
};

type Runtime = { nodes: Record<string, THREE.Object3D> };
type LabWindow = Window & {
  __texturesReady?: boolean;
  __shoot?: (name: string, options?: ShotOptions) => Promise<unknown>;
  __apply?: (options?: ShotOptions) => void;
};

function initialOptions(): ShotOptions {
  const p = new URLSearchParams(window.location.search);
  return {
    view: (p.get('view') as ShotOptions['view']) ?? 'reference',
    yaw: Number(p.get('yaw') ?? 45),
    fit: p.get('fit') === '1',
    elev: Number(p.get('elev') ?? 30),
    rig: (p.get('rig') as ShotOptions['rig']) ?? (p.get('view') === 'iso' ? 'converter' : 'lookdev'),
    bg: p.get('bg') ?? '6f6d64',
    stripped: p.get('stripped') === '1',
    open: Number(p.get('open') ?? 0),
    exposure: p.has('exposure') ? Number(p.get('exposure')) : undefined,
    tone: (p.get('tone') as ShotOptions['tone']) ?? undefined,
  };
}

export default function EntranceLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [initial] = useState(initialOptions);
  const [config] = useState(() => MODELS[new URLSearchParams(window.location.search).get('model') ?? 'hqAvatar'] ?? MODELS.hqAvatar);
  const [open, setOpen] = useState(initial.open ?? 0);
  const applyRef = useRef<(o: ShotOptions) => void>(() => {});
  const [label, setLabel] = useState(`${initial.view} · ${initial.rig}`);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = window as LabWindow;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    const scene = new THREE.Scene();

    // Two light rigs in one scene; only one is visible per shot.
    config.configure(renderer);
    const lookdevTone = { toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure };
    const environment = config.environment(renderer);
    const lookdev = config.lights('reference');
    const converter = new THREE.Group();
    converter.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(5, 10, 5);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-5, 5, -5);
    converter.add(key, fill);
    // Optional soft shadows for the converter rig: a weak light from screen upper left that casts, the ambient drops to match
    const ambient = converter.children[0] as THREE.AmbientLight;
    const shade = new THREE.DirectionalLight(0xfff4e6, 0.6);
    shade.position.set(-4, 10, 6);
    shade.castShadow = true;
    shade.shadow.mapSize.set(4096, 4096);
    shade.shadow.normalBias = 0.01;
    shade.shadow.radius = 3;
    Object.assign(shade.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 40 });
    shade.shadow.camera.updateProjectionMatrix();
    converter.add(shade);
    const photo = new THREE.Group();
    photo.add(new THREE.HemisphereLight(0xdfe8ff, 0x6b6455, 0.6));
    if (config.sun) {
      const sun = new THREE.DirectionalLight(0xfff6e8, config.sun.intensity);
      sun.position.set(...config.sun.position);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.normalBias = 0.02;
      sun.shadow.radius = 2;
      Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 30 });
      sun.shadow.camera.updateProjectionMatrix();
      photo.add(sun);
    }
    scene.add(lookdev, photo, converter);

    const model = config.create({ castShadow: true, receiveShadow: true });
    scene.add(model);
    const runtime = model.userData.sculptRuntime as Runtime;
    const restX: Record<string, number> = {};
    for (const id of Object.keys(config.leaves)) {
      const node = runtime?.nodes?.[id];
      if (node) restX[id] = node.position.x;
    }
    const original = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    const flat = new Map<THREE.Mesh, THREE.Material>();
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      original.set(mesh, mesh.material);
      const src = mesh.material as THREE.MeshStandardMaterial;
      flat.set(mesh, new THREE.MeshBasicMaterial({ color: src.color ?? new THREE.Color(0x888888) }));
    });
    // Mask renders: each mesh's sculpt node id (nearest ancestor that is a runtime node), 'avatar' for the avatar's meshes
    const nodeIds = new Map<THREE.Object3D, string>();
    const nodeRuntime = (model.userData.sculptRuntime ?? model.children.find((c) => c.userData.sculptRuntime)?.userData.sculptRuntime) as Runtime | undefined;
    for (const [id, node] of Object.entries(nodeRuntime?.nodes ?? {})) nodeIds.set(node, id);
    const avatarGroup = model.userData.avatarGroup as THREE.Object3D | undefined;
    const meshNode = new Map<THREE.Mesh, string>();
    const baseVisible = new Map<THREE.Mesh, boolean>();
    const baseOrder = new Map<THREE.Mesh, number>();
    for (const mesh of original.keys()) {
      baseVisible.set(mesh, mesh.visible);
      baseOrder.set(mesh, mesh.renderOrder);
      let o: THREE.Object3D | null = mesh;
      let id = '';
      while (o && !id) {
        if (o === avatarGroup) id = 'avatar';
        else id = nodeIds.get(o) ?? '';
        o = o.parent;
      }
      meshNode.set(mesh, id);
    }
    const maskColour = (i: number) => new THREE.Color().setRGB(i < 0 ? 0.5 : 1, i < 0 ? 0.5 : (8 * (i + 1)) / 255, i < 0 ? 0.5 : 0, THREE.SRGBColorSpace);
    const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1, 0.8, 0.52, THREE.SRGBColorSpace) });
    const hideMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    const maskMats = new Map<string, THREE.MeshBasicMaterial>();
    const maskMat = (key: string, c: THREE.Color) => {
      if (!maskMats.has(key)) maskMats.set(key, new THREE.MeshBasicMaterial({ color: c }));
      return maskMats.get(key)!;
    };
    const avatar = model.userData.avatar as AvatarRig | undefined;
    // a model may frame by one of its parts (the seated-avatar scene frames by the building, as the roof-off sprite)
    const framed = (model.userData.boundsFrom as THREE.Object3D | undefined) ?? model;
    const box = new THREE.Box3().setFromObject(framed);
    // Rest-pose bounds in the model's parent frame (skinned vertices, so a posed frame never re-frames the sprite)
    const restBox = config.restBounds
      ? (avatar && !model.userData.avatarGroup ? skinnedBounds(model).applyMatrix4(model.matrix) : box.clone())
      : null;
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    const eyeCamera = new THREE.PerspectiveCamera(config.eye?.fov ?? 60, config.reference.width / config.reference.height, 0.02, 50);
    let camera: THREE.Camera = ortho;

    const apply = (o: ShotOptions) => {
      const opts = { ...initial, ...o };
      // Lights, tone mapping, background
      const isConverter = opts.rig === 'converter';
      lookdev.visible = opts.rig === 'lookdev';
      photo.visible = opts.rig === 'photo';
      converter.visible = isConverter;
      shade.visible = isConverter && !!opts.shadow;
      ambient.intensity = isConverter && opts.shadow ? 0.36 : 0.6;
      scene.environment = isConverter ? null : environment;
      renderer.toneMapping = isConverter
        ? THREE.NoToneMapping
        : opts.tone === 'neutral' ? THREE.NeutralToneMapping : opts.tone === 'aces' ? THREE.ACESFilmicToneMapping : lookdevTone.toneMapping;
      renderer.toneMappingExposure = isConverter ? 1 : (opts.exposure ?? lookdevTone.exposure);
      if (isConverter) renderer.setClearColor(0x000000, 0);
      else renderer.setClearColor(new THREE.Color(`#${opts.bg}`), 1);
      // Materials
      for (const [mesh, mat] of original) mesh.material = opts.stripped ? flat.get(mesh)! : mat;
      // Mask render and solo silhouettes (occlusion counts)
      // an entry may join several prefixes with '|' (one story prop made of several parts, e.g. a desk and its chair)
      const match = (id: string, list: string[]) => list.findIndex((entry) => entry.split('|').some((p) => (p === 'avatar' ? id === 'avatar' : id !== 'avatar' && id.startsWith(p))));
      for (const mesh of original.keys()) {
        const id = meshNode.get(mesh) ?? '';
        mesh.renderOrder = baseOrder.get(mesh)!;
        mesh.visible = baseVisible.get(mesh)! && (!opts.only || match(id, opts.only) >= 0);
        if (!opts.masks) continue;
        if ((original.get(mesh) as THREE.Material).transparent) { mesh.visible = false; continue; }   // see-through glass hides nothing
        const i = match(id, opts.masks);
        mesh.material = id === 'avatar' ? maskMat('avatar', new THREE.Color().setRGB(0, 0, 1, THREE.SRGBColorSpace)) : maskMat(`m${i}`, maskColour(i));
      }
      if (opts.masks) { lookdev.visible = photo.visible = converter.visible = shade.visible = false; }
      if (opts.glow) {
        const lit = new RegExp(opts.glow);
        for (const mesh of original.keys()) {
          if (!mesh.visible) continue;
          const id = (mesh.userData.sculptComponent as { id?: string } | undefined)?.id ?? meshNode.get(mesh) ?? '';
          // the glass draws after every hiding mesh, so what stands in front of it (a slat, a column) cuts it
          // a self-lit part (a sign's face) keeps its own unlit material: the night layer shows it as it is
          if (lit.test(id)) { if (!mesh.userData.selfLit) mesh.material = glowMat; mesh.renderOrder = 1; }
          else if ((original.get(mesh) as THREE.Material).transparent) mesh.visible = false;
          else mesh.material = hideMat;
        }
        shade.visible = false;
      }
      // Avatar stand point (plan tiles) on models that carry a plan
      const plan = model.userData.plan as { w: number; h: number } | undefined;
      if (plan && avatarGroup && opts.avatarAt) avatarGroup.position.set(opts.avatarAt[0] - plan.w / 2, 0.05, opts.avatarAt[1] - plan.h / 2);
      if (plan && avatarGroup && opts.avatarYaw !== undefined) avatarGroup.rotation.y = THREE.MathUtils.degToRad(opts.avatarYaw);
      // Doors
      for (const [id, dir] of Object.entries(config.leaves)) {
        const node = runtime?.nodes?.[id];
        if (node) node.position.x = restX[id] + dir * config.travel * (opts.open ?? 0);
      }
      // Converter normalisation applies only to the 'sprite' view
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);
      model.rotation.set(0, THREE.MathUtils.degToRad(opts.spin ?? 0), 0);
      // Avatar pose: a clip at time t, or the bind pose
      if (avatar) {
        standAvatar(avatar);
        if (opts.clip) avatar.seek(opts.clip, opts.t ?? 0);
        else avatar.rest();
        if (opts.sit !== undefined) poseAvatarSit(avatar, opts.sit);
        if (opts.follow) {
          model.updateMatrixWorld(true);
          const hip = avatar.bones.pelvis.getWorldPosition(new THREE.Vector3());
          model.position.x -= hip.x;
          model.position.z -= hip.z;
        }
      }
      // Camera
      camera = opts.view !== 'sprite' && opts.view !== 'iso' && config.eye ? eyeCamera : ortho;
      if (opts.view === 'sprite') {
        // Same maths as /tools/sprite-converter: base at y = 0 via an UNscaled offset, then
        // scale to 3 / maxDim; ortho frustum 5 / zoom split by the vertical offset; iso camera
        // at distance 10 looking at the origin; square output.
        model.updateMatrixWorld(true);
        const b = restBox ? restBox.clone() : new THREE.Box3().setFromObject(framed);
        const centre = b.getCenter(new THREE.Vector3());
        const size = b.getSize(new THREE.Vector3());
        model.position.set(-centre.x, -b.min.y, -centre.z);
        model.scale.setScalar(3 / Math.max(size.x, size.y, size.z));
        const frustum = 5 / (opts.zoom ?? 1);
        const voff = opts.voff ?? 0.31;
        ortho.left = -frustum / 2; ortho.right = frustum / 2;
        ortho.top = frustum * (1 - voff); ortho.bottom = -frustum * voff;
        const iso = opts.pitch !== undefined ? THREE.MathUtils.degToRad(opts.pitch) : Math.atan(1 / Math.sqrt(2));
        const yaw = THREE.MathUtils.degToRad(opts.yaw ?? 45);
        const focus = new THREE.Vector3();
        if (opts.aim) {
          // world = position + scale * local (position is the unscaled -centre offset above)
          const s = 3 / Math.max(size.x, size.y, size.z);
          focus.set(-centre.x + s * opts.aim[0], 0, -centre.z + s * opts.aim[1]);
        }
        const focusNode = opts.focusNode ? runtime?.nodes?.[opts.focusNode] : undefined;
        if (focusNode) {
          // Aim at the part's bounding-box centre (extruded parts share the model origin as their pivot)
          model.updateMatrixWorld(true);
          new THREE.Box3().setFromObject(focusNode).getCenter(focus);
        }
        ortho.position.set(focus.x + 10 * Math.cos(iso) * Math.sin(yaw), focus.y + 10 * Math.sin(iso), focus.z + 10 * Math.cos(iso) * Math.cos(yaw));
        ortho.lookAt(focus);
        renderer.setSize(opts.size ?? 384, opts.size ?? 384, false);
      } else if (opts.view === 'iso') {
        const size = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        const half = Math.max(size.x, size.z) * 0.62;
        const iso = opts.pitch !== undefined ? THREE.MathUtils.degToRad(opts.pitch) : Math.atan(1 / Math.sqrt(2));
        const yaw = THREE.MathUtils.degToRad(opts.yaw ?? 45);
        ortho.position.set(centre.x + 40 * Math.cos(iso) * Math.sin(yaw), centre.y + 40 * Math.sin(iso), centre.z + 40 * Math.cos(iso) * Math.cos(yaw));
        ortho.lookAt(centre);
        ortho.left = -half; ortho.right = half; ortho.top = half; ortho.bottom = -half;
        let width = opts.size ?? 512, height = opts.size ?? 512;
        if (opts.fit) {
          // Crop the frustum to the model's projected bounds so area-based gate checks compare
          // like with like (a long wall in a square frame reads as a false collapse).
          ortho.updateMatrixWorld();
          const local = [0, 1].flatMap((i) => [0, 1].flatMap((j) => [0, 1].map((k) => new THREE.Vector3(
            i ? box.max.x : box.min.x, j ? box.max.y : box.min.y, k ? box.max.z : box.min.z,
          ).applyMatrix4(ortho.matrixWorldInverse))));
          const xs = local.map((v) => v.x), ys = local.map((v) => v.y);
          const m = 0.04 * (Math.max(...xs) - Math.min(...xs));
          ortho.left = Math.min(...xs) - m; ortho.right = Math.max(...xs) + m;
          ortho.bottom = Math.min(...ys) - m; ortho.top = Math.max(...ys) + m;
          width = 1024;
          height = Math.round(width * (ortho.top - ortho.bottom) / (ortho.right - ortho.left));
        }
        renderer.setSize(width, height, false);
      } else if (config.eye) {
        camera = eyeCamera;
        eyeCamera.position.set(...config.eye.position);
        eyeCamera.lookAt(new THREE.Vector3(...config.eye.target));
        eyeCamera.updateProjectionMatrix();
        renderer.setSize(config.reference.width, config.reference.height, false);
      } else {
        const { width, height, halfW } = config.reference;
        ortho.left = -halfW; ortho.right = halfW; ortho.top = halfW * height / width; ortho.bottom = -halfW * height / width;
        const elev = THREE.MathUtils.degToRad(opts.elev ?? 30);
        const target = new THREE.Vector3(...config.reference.target);
        ortho.position.set(target.x, target.y + 40 * Math.sin(elev), target.z + 40 * Math.cos(elev));
        ortho.lookAt(target);
        renderer.setSize(width, height, false);
      }
      ortho.updateProjectionMatrix();
      renderer.render(scene, camera);
      setLabel(`${opts.view} · ${opts.rig}${opts.stripped ? ' · stripped' : ''} · open ${(opts.open ?? 0).toFixed(2)}`);
    };
    applyRef.current = apply;

    let current: ShotOptions = {};
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      renderer.render(scene, camera);
    };
    apply(current);
    loop();

    w.__texturesReady = false;
    THREE.DefaultLoadingManager.onLoad = () => {
      w.__texturesReady = true;
    };
    w.__apply = (o: ShotOptions = {}) => {
      current = o;
      apply(o);
    };
    (w as LabWindow & { __stats?: () => unknown }).__stats = () => {
      let triangles = 0, meshes = 0;
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        meshes += 1;
        const g = mesh.geometry;
        triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
      });
      renderer.render(scene, camera);
      return { triangles: Math.round(triangles), meshes, drawCalls: renderer.info.render.calls, textures: renderer.info.memory.textures, size: box.getSize(new THREE.Vector3()).toArray() };
    };
    (w as LabWindow & { __parts?: () => unknown }).__parts = () => {
      // Parts manifest for img2threejs check_part_coverage.py: one entry per named component mesh
      const parts: { name: string; id: string; kind: string; triangles: number }[] = [];
      let unnamedMeshes = 0;
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const comp = mesh.userData.sculptComponent as { id?: string; name?: string } | undefined;
        const g = mesh.geometry;
        const triangles = Math.round((g.index ? g.index.count : g.attributes.position.count) / 3);
        if (comp?.name) parts.push({ name: comp.name, id: comp.id ?? '', kind: 'part', triangles });
        else unnamedMeshes += 1;
      });
      return { model: config.name, parts, unnamedMeshes };
    };
    // Debug handle for probing the scene from the browser console
    (w as LabWindow & { __scene?: unknown }).__scene = { scene, model, renderer, lookdev, photo, converter, camera };
    // Render one shot and hand back the PNG directly (capture scripts; no receiver needed)
    (w as LabWindow & { __render?: unknown }).__render = (o: ShotOptions = {}) => {
      current = o;
      apply(o);
      renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    };
    if (avatar) {
      const target = (model.userData.avatarGroup as THREE.Object3D | undefined) ?? model;
      (w as LabWindow & { __avatarHarness?: unknown }).__avatarHarness = {
        meshBuffers: () => avatarHarness.meshBuffers(avatar.model),
        sampleClips: (n?: number) => avatarHarness.sampleClips(target, n),
        bindingSamples: (n?: number) => avatarHarness.bindingSamples(target, n),
        deformation: () => avatarHarness.deformation(target),
        bindRestore: () => avatarHarness.bindRestore(target),
        meshVisibility: () => avatarHarness.meshVisibility(target),
        chainAnchors: () => avatarHarness.chainAnchors(target),
        binding: () => avatarHarness.binding(target),
        stats: () => avatarHarness.stats(target),
        hairGeometry: () => avatarHarness.hairGeometry(target),
      };
    }
    (w as LabWindow & { __labReady?: boolean }).__labReady = true;
    w.__shoot = async (name: string, o: ShotOptions = {}) => {
      current = o;
      apply(o);
      // Render synchronously: a hidden pane throttles requestAnimationFrame.
      renderer.render(scene, camera);
      const res = await fetch('http://localhost:8765/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dataUrl: canvas.toDataURL('image/png'), meta: { ...initial, ...o } }),
      });
      return res.json();
    };

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, [initial, config]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 space-y-4">
      <h1 className="text-xl font-bold">{config.name} lab · {label}</h1>
      <canvas ref={canvasRef} className="max-w-full border border-slate-700" style={{ imageRendering: 'pixelated' }} />
      <label className="block text-sm">
        Doors open: {open.toFixed(2)}
        <input
          type="range" min="0" max="1" step="0.05" value={open}
          onChange={(e) => {
            const v = Number(e.target.value);
            setOpen(v);
            applyRef.current({ open: v });
          }}
          className="w-full"
        />
      </label>
    </div>
  );
}
