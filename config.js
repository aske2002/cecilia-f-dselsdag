// ═══════════════════════════════════════════════════════════════════
//  KONFIGURATION  –  Ret disse værdier til at passe din scanning
// ═══════════════════════════════════════════════════════════════════
//
//  TIP: Åbn din .glb i Blender og aflæs koordinaterne der.
//       Y er op, X er til siden, Z er frem/tilbage.
//
// ───────────────────────────────────────────────────────────────────

export const config = {

  // ── .glb fil ──────────────────────────────────────────────────────
  //  Læg din Blender-eksport som:  assets/room.glb
  roomFile: 'assets/room.glb',


  // ── Gåboks (bounding box) ─────────────────────────────────────────
  //  Den firkantede zone hun må gå i.
  //  floorY = Y-koordinat for gulvet (normalt 0).
  bounds: {
    minX: -1,
    maxX:  1.5,
    minZ: -2,
    maxZ:  2.5,
    floorY: 0,
  },


  // ── Startposition & startretning ──────────────────────────────────
  //  yaw: vandret drejevinkel i radianer (0 = ser mod +Z).
  //  pitch: lodret vinkel (0 = vandret, positiv = ser op).
  start: {
    x: 1.2,
    z: -0.75,
    yaw:   0,
    pitch: 0,
  },

  //  Øjenhøjde over gulvet (i verdensenheder / meter).
  cameraHeight: 1.6,


  // ── Kortet ────────────────────────────────────────────────────────
  //  position: dér den svævende kuvert vises i 3D-scannen.
  //  message:  den tekst der åbner sig, når hun klikker på det.
  card: {
    position: { x: -0.5, y: 1.0, z: -0.75 },

    message:
`Kære Prutte,

Tillykke med fødselsdagen!

Jeg elsker dig over alt i verden – du er virkelig et fantastisk menneske, og jeg er så glad for, at vi begge drak os i hegnet til førtste onsdagsbar!

Jeg ser frem til alle de eventyr vi skal på, og minder vi skal skabe sammen. Jeg tror vi får en fantastisk tur til Norge.

Du får her en lille skattejagt (virtuelt) på dit eget værelse. Find gaven her, og du finder den samme sted i virkeligheden.

Love yousss
- Aske`,
  },


  // ── Gaver (spilles i denne rækkefølge) ───────────────────────────
  //  position: dér gavekassen svæver i 3D-scannen.
  //  color:    boksens farve som hex-tal (0xRRGGBB).
  //  clue:     ledetråden der vises, når hun klikker på boksen.
  gifts: [
    {
      position: { x:  1.5, y: 0.05, z: 2.2 },
      color: 0xff6b9d,                          // pink
      clue: '🛏️  Skal du ikke til at strikke lidt mere?:)…',
    },
    {
      position: { x: -1.2, y: 0.2, z:  0.1 },
      color: 0x6bcbff,                          // lyseblå
      clue: '📚  Puha der lugter lidt hernede!',
    },
  ],


  // ── Slutbesked ────────────────────────────────────────────────────
  //  Vises på skærmen, når hun har fundet begge gaver.
  endMessage:
`Du fandt dem alle! 🥰

Jeg håber det gør dit setup lidt federe, så du kan programmere på dobbelt hastighed.
Igen, tillykke med fødselsdagen min elskede!`,

};
