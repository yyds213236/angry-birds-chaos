(() => {
  "use strict";

  const WORLD_WIDTH = 1280;
  const WORLD_HEIGHT = 600;
  const TAU = 2 * Math.PI;

  const birdPalettes = {
    red: { light: "#ff8463", base: "#f64f48", shade: "#b92840", ink: "#752837", belly: "#ffd0a0", brow: "#4b2636" },
    yellow: { light: "#fff19a", base: "#ffbd38", shade: "#e27722", ink: "#914027", belly: "#ffe998", brow: "#5d302f" },
    blue: { light: "#86eaff", base: "#3fb6ee", shade: "#3659bb", ink: "#2d468d", belly: "#c0f2ff", brow: "#2a305d" },
    black: { light: "#747499", base: "#474666", shade: "#292338", ink: "#251b2f", belly: "#8c7a99", brow: "#221927" },
  };
  const blockPalettes = {
    wood: { light: "#ffcd7a", base: "#ec984e", shade: "#ae552f", ink: "#763a32", inner: "#8c4c3c" },
    glass: { light: "#cdfbff", base: "#7adaf1", shade: "#5b92d4", ink: "#4775b6", inner: "#347fb2" },
    stone: { light: "#c9c6df", base: "#9e9cbc", shade: "#696986", ink: "#535471", inner: "#67627f" },
    tnt: { light: "#ff8a61", base: "#f75a4e", shade: "#b72e4a", ink: "#803347", inner: "#a83e48" },
  };
  const fxColors = {
    red: ["#fff2ac", "#ffcb65", "#f96a58", "#e94160"],
    yellow: ["#fff2aa", "#ffdf59", "#ff9a44"],
    blue: ["#e6fdff", "#9decff", "#51aaf8", "#636fe9"],
    black: ["#fff2ad", "#f7a567", "#ad72cf", "#514177"],
    wood: ["#ffdc8c", "#ebad5a", "#b96b43"],
    glass: ["#d2faff", "#80dff2", "#53a9e1"],
    stone: ["#ddd6ec", "#a19ab9", "#756d89"],
    pig: ["#eeff9c", "#b5e455", "#79be55"],
    tnt: ["#fff8b5", "#ffd65d", "#ff9053", "#e24a68"],
  };

  function path(ctx, draw, fill, stroke, width = 2) {
    ctx.beginPath();
    draw(ctx);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function ellipse(ctx, x, y, rx, ry, color, stroke, width, rotation = 0) {
    path(ctx, p => p.ellipse(x, y, rx, ry, rotation, 0, TAU), color, stroke, width);
  }

  function rounded(ctx, x, y, w, h, radius, color, stroke, width) {
    path(ctx, p => p.roundRect(x, y, w, h, Math.min(radius, w / 2, h / 2)), color, stroke, width);
  }

  function fade(ctx, x1, y1, x2, y2, colors) {
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    colors.forEach(([stop, color]) => gradient.addColorStop(stop, color));
    return gradient;
  }

  function birdSilhouette(ctx, type) {
    if (type === "yellow") {
      ctx.moveTo(-28, 19);
      ctx.quadraticCurveTo(-34, 11, -22, -3);
      ctx.lineTo(-7, -24);
      ctx.quadraticCurveTo(2, -36, 10, -23);
      ctx.lineTo(28, 6);
      ctx.quadraticCurveTo(43, 28, 18, 30);
      ctx.lineTo(-13, 30);
      ctx.quadraticCurveTo(-24, 29, -28, 19);
    } else {
      ctx.ellipse(0, 0, type === "blue" ? 29 : 31, 30, .04, 0, TAU);
    }
    ctx.closePath();
  }

  function drawBird(ctx, type, x, y, radius = 30, angle = 0, blink = false) {
    const palette = birdPalettes[type] || birdPalettes.red;
    const scale = radius / 30;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // The narrow tail keeps a clear silhouette when the bird spins.
    path(ctx, p => {
      p.moveTo(-25, -6);
      p.quadraticCurveTo(-37, -10, -45, -6);
      p.quadraticCurveTo(-42, 0, -35, 3);
      p.lineTo(-44, 6);
      p.quadraticCurveTo(-37, 13, -27, 11);
      p.closePath();
    }, palette.shade, palette.ink, 2.5);
    path(ctx, p => {
      p.moveTo(-13, -22);
      p.quadraticCurveTo(-26, -41, -9, -37);
      p.quadraticCurveTo(-2, -37, -1, -27);
      p.quadraticCurveTo(0, -37, 7, -36);
      p.quadraticCurveTo(14, -33, 9, -23);
      p.closePath();
    }, palette.base, palette.ink, 2.5);

    if (type === "black") {
      path(ctx, p => {
        p.moveTo(1, -31);
        p.quadraticCurveTo(0, -44, 13, -46);
      }, null, "#3e344f", 5);
      ellipse(ctx, 14, -45, 5, 5, "#ffae48", "#813d4c", 2);
      ellipse(ctx, 16, -47, 2, 2, "#fff9b5");
    }

    const body = fade(ctx, -10, -30, 13, 30, [[0, palette.light], [.47, palette.base], [1, palette.shade]]);
    path(ctx, p => birdSilhouette(p, type), body, palette.ink, 2.7);
    ctx.save();
    ctx.beginPath();
    birdSilhouette(ctx, type);
    ctx.clip();
    const belly = fade(ctx, 0, 8, 5, 35, [[0, palette.belly], [1, palette.light]]);
    ellipse(ctx, 3, 31, 33, 20, belly, null, 0, -.07);
    ellipse(ctx, -16, -13, 11, 6, "#fff9e339", null, 0, -.76);
    ctx.restore();
    path(ctx, p => {
      p.moveTo(-27, 4);
      p.quadraticCurveTo(-20, 9, -15, 5);
    }, null, palette.shade, 2);
    path(ctx, p => {
      p.moveTo(-26, 9);
      p.quadraticCurveTo(-20, 12, -17, 10);
    }, null, palette.shade, 1.5);

    const eye = "#fff8df";
    if (blink) {
      path(ctx, p => {
        p.moveTo(-10, -1); p.quadraticCurveTo(-3, 1, 3, -2);
        p.moveTo(11, -2); p.quadraticCurveTo(17, 1, 24, -2);
      }, null, palette.ink, 2.4);
    } else {
      ellipse(ctx, 3, -2, 10, 10.5, eye, palette.ink, 1.7, .18);
      ellipse(ctx, 17, -4, 9, 10, eye, palette.ink, 1.7, -.12);
      ellipse(ctx, 7, -1, 3.2, 4.2, "#382b3c");
      ellipse(ctx, 20, -3, 3.2, 4.2, "#382b3c");
      ellipse(ctx, 8, -2.6, 1.05, 1.05, "#fffae7");
      ellipse(ctx, 21, -4.6, 1.05, 1.05, "#fffae7");
    }
    path(ctx, p => {
      p.moveTo(-12, -14); p.quadraticCurveTo(-1, -15, 9, -8);
      p.lineTo(6, -4); p.quadraticCurveTo(-2, -10, -14, -9); p.closePath();
      p.moveTo(10, -8); p.quadraticCurveTo(19, -17, 26, -14);
      p.lineTo(27, -10); p.quadraticCurveTo(19, -10, 13, -5); p.closePath();
    }, palette.brow);
    const beak = fade(ctx, 18, 4, 23, 20, [[0, "#fff29d"], [.55, "#ffbc51"], [1, "#f3783b"]]);
    path(ctx, p => {
      p.moveTo(12, 6);
      p.quadraticCurveTo(19, 2, 27, 6);
      p.quadraticCurveTo(34, 8, 36, 12);
      p.quadraticCurveTo(26, 14, 21, 17);
      p.quadraticCurveTo(14, 16, 12, 12);
      p.closePath();
    }, beak, "#8a4639", 2);
    path(ctx, p => { p.moveTo(16, 11); p.quadraticCurveTo(24, 11, 33, 12); }, null, "#9f5539", 1.45);
    ctx.restore();
  }

  function drawHelmet(ctx, cracked) {
    const edge = "#41496a";
    const metal = fade(ctx, -13, -31, 10, -8, [[0, "#f0f4ff"], [.37, "#afbdd5"], [1, "#596786"]]);
    path(ctx, p => {
      p.moveTo(-25, -9);
      p.bezierCurveTo(-29, -23, -15, -35, 0, -35);
      p.bezierCurveTo(13, -35, 27, -25, 27, -13);
      p.lineTo(22, -9);
      p.lineTo(16, -13);
      p.quadraticCurveTo(0, -16, -17, -11);
      p.lineTo(-20, -4);
      p.closePath();
    }, metal, edge, 2.6);
    path(ctx, p => {
      p.moveTo(-23, -12); p.quadraticCurveTo(1, -23, 26, -13);
    }, null, "#4c5374", 4);
    path(ctx, p => {
      p.moveTo(-17, -24); p.quadraticCurveTo(-7, -33, 5, -31);
    }, null, "#fcf9ff", 2.3);
    for (const x of [-18, 2, 21]) ellipse(ctx, x, -15, 1.8, 1.8, "#ecf2ff", edge, 1.1);
    if (cracked) {
      path(ctx, p => {
        p.moveTo(10, -32); p.lineTo(8, -25); p.lineTo(13, -23); p.lineTo(9, -17);
        p.moveTo(13, -23); p.lineTo(20, -24); p.lineTo(23, -22);
      }, null, edge, 2.1);
    }
  }

  function drawShield(ctx, shieldRatio) {
    const rim = "#45476a";
    const metal = fade(ctx, -33, -12, -12, 26, [[0, "#ecf7ff"], [.39, "#b5c9e0"], [1, "#637495"]]);
    path(ctx, p => {
      p.moveTo(-33, -7);
      p.quadraticCurveTo(-24, -9, -17, -15);
      p.quadraticCurveTo(-9, -9, 0, -8);
      p.lineTo(-2, 7);
      p.quadraticCurveTo(-5, 17, -15, 25);
      p.quadraticCurveTo(-29, 20, -32, 9);
      p.closePath();
    }, metal, rim, 2.5);
    path(ctx, p => {
      p.moveTo(-28, -4);
      p.quadraticCurveTo(-21, -6, -17, -10);
      p.quadraticCurveTo(-10, -6, -5, -5);
      p.lineTo(-7, 8);
      p.quadraticCurveTo(-9, 14, -15, 20);
      p.quadraticCurveTo(-23, 16, -27, 9);
      p.closePath();
    }, "#6278a0", "#f1f9ff", 1.6);
    ellipse(ctx, -16, 4, 5.5, 5.5, "#c6ddf1", rim, 1.3);
    ellipse(ctx, -17.3, 2.6, 1.7, 1.6, "#fff7e9");
    if (shieldRatio < .61) {
      path(ctx, p => {
        p.moveTo(-9, -8); p.lineTo(-14, -3); p.lineTo(-11, 0); p.lineTo(-18, 10); p.lineTo(-16, 15);
      }, null, rim, 2.05);
    }
  }

  function drawCrown(ctx, raging, finalKing) {
    const rim = finalKing ? "#542c60" : raging ? "#9f3e52" : "#985343";
    const gold = fade(ctx, 0, -44, 0, -20, finalKing
      ? [[0, "#fff4bf"], [.55, "#ffcf6e"], [1, "#ad5a92"]]
      : [[0, "#fff5b5"], [.53, "#ffcb65"], [1, "#de8247"]]);
    path(ctx, p => {
      p.moveTo(-18, -19); p.lineTo(-22, -39); p.lineTo(-11, -32);
      p.lineTo(0, -46); p.lineTo(10, -32); p.lineTo(22, -39);
      p.lineTo(17, -20); p.quadraticCurveTo(0, -15, -18, -19); p.closePath();
    }, gold, rim, 2.5);
    path(ctx, p => {
      p.moveTo(-18, -25); p.quadraticCurveTo(0, -20, 18, -25);
    }, null, "#fff1a3", 2.2);
    path(ctx, p => {
      p.moveTo(0, -36); p.lineTo(5, -30); p.lineTo(0, -23); p.lineTo(-5, -30); p.closePath();
    }, finalKing ? "#9052c1" : raging ? "#ff624e" : "#e45e7f", rim, 1.5);
    ellipse(ctx, -22, -39, 2.8, 2.8, "#ffdd78", rim, 1.2);
    ellipse(ctx, 22, -39, 2.8, 2.8, "#ffdd78", rim, 1.2);
    if (finalKing) ellipse(ctx, 0, -46, 4.2, 4.2, "#fbeb9d", rim, 1.6);
  }

  function drawPig(ctx, x, y, radius = 25, angle = 0, hurt = false, blink = false, type = "", details) {
    const scale = radius / 25;
    const king = type === "king";
    const finalKing = king && details?.finalKing;
    const raging = king && details?.phase === 2;
    const rim = raging ? "#884545" : "#45623d";
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (raging) {
      const aura = ctx.createRadialGradient(0, -2, 18, 0, -2, 45);
      aura.addColorStop(0, "#ffa078ae");
      aura.addColorStop(.72, "#ee56836c");
      aura.addColorStop(1, "#f26b8400");
      ellipse(ctx, 0, -2, 45, 44, aura);
      ellipse(ctx, 0, -2, 33, 34, null, "#7e406d", 4.2);
      ellipse(ctx, 0, -2, 33, 34, null, "#ffdc8c", 2.3);
    }
    if (finalKing) {
      path(ctx, p => {
        p.moveTo(-13, 4); p.quadraticCurveTo(-25, 6, -35, 22);
        p.lineTo(-16, 27); p.quadraticCurveTo(0, 22, 16, 27);
        p.lineTo(35, 22); p.quadraticCurveTo(25, 6, 13, 4);
        p.closePath();
      }, fade(ctx, 0, 3, 0, 28, [[0, "#a75da9"], [1, "#67386f"]]), "#50284f", 2.7);
      path(ctx, p => {
        p.moveTo(-32, 21); p.quadraticCurveTo(-27, 25, -20, 24);
        p.moveTo(20, 24); p.quadraticCurveTo(27, 25, 32, 21);
      }, null, "#f4ba78", 2.25);
    }
    ellipse(ctx, -18, -18, 8, 10, "#8dcc55", rim, 2, -.38);
    ellipse(ctx, 17, -18, 8, 10, "#a3dd6c", rim, 2, .42);
    ellipse(ctx, -17, -20, 3.8, 5.4, "#5d9546", null, 0, -.43);
    ellipse(ctx, 17, -20, 3.6, 5.2, "#619c4b", null, 0, .44);
    const body = fade(ctx, -8, -25, 8, 25, raging
      ? [[0, "#fff097"], [.45, "#bfc955"], [1, "#83994b"]]
      : [[0, "#dcf68a"], [.45, "#a8d950"], [1, "#6dad45"]]);
    ellipse(ctx, 0, 0, 25, 24, body, rim, 2.4, -.03);
    ellipse(ctx, -9, -14, 10, 4.4, "#ffffbe61", null, 0, -.3);
    ellipse(ctx, -15, 8, 5, 3, "#dbf27d70");
    ellipse(ctx, 16, 8, 5, 3, "#dbf27d70");

    if (type === "armored") drawHelmet(ctx, details?.healthRatio <= .5);
    if (king) drawCrown(ctx, raging, finalKing);

    if (!king && (blink || hurt)) {
      path(ctx, p => {
        p.moveTo(-16, -4); p.quadraticCurveTo(-12, -8, -7, -4);
        p.moveTo(6, -4); p.quadraticCurveTo(12, -8, 17, -4);
      }, null, "#426442", 2.15);
    } else {
      ellipse(ctx, -11, -4, 6.5, 7.2, "#fffde9", "#689143", 1.4, .12);
      ellipse(ctx, 11, -4, 6.5, 7.2, "#fffde9", "#689143", 1.4, -.12);
      ellipse(ctx, -12, -3, 2.3, 3, raging ? "#983c42" : "#334743");
      ellipse(ctx, 10, -3, 2.3, 3, raging ? "#983c42" : "#334743");
      if (king) {
        path(ctx, p => {
          p.moveTo(-18, -11); p.lineTo(-7, -8);
          p.moveTo(7, -8); p.lineTo(18, -11);
        }, null, raging ? "#9b4148" : "#426442", 3.2);
      }
    }
    const snout = fade(ctx, 0, 1, 0, 19, [[0, "#d8f582"], [1, "#8abe56"]]);
    ellipse(ctx, 1, 7.5, 13.5, 8.9, snout, "#699d45", 1.6, -.03);
    ellipse(ctx, -4, 7.3, 2.5, 4, "#5e8744", null, 0, -.2);
    ellipse(ctx, 6, 7.2, 2.25, 3.7, "#5e8744", null, 0, .15);
    if (king) {
      if (finalKing) {
        path(ctx, p => {
          p.moveTo(-20, 4); p.lineTo(-17, 7); p.moveTo(-23, 6); p.lineTo(-19, 11);
          p.moveTo(20, 4); p.lineTo(17, 7); p.moveTo(23, 6); p.lineTo(19, 11);
        }, null, raging ? "#cf4b53" : "#824b91", 2.9);
      }
      path(ctx, p => {
        p.moveTo(-16, 14); p.quadraticCurveTo(-20, 9, -22, 12);
        p.lineTo(-23, 16); p.lineTo(-16, 18); p.closePath();
        p.moveTo(16, 14); p.quadraticCurveTo(20, 9, 22, 12);
        p.lineTo(23, 16); p.lineTo(16, 18); p.closePath();
      }, "#fff3ce", rim, 1.65);
      path(ctx, p => {
        p.moveTo(-8, 19); p.quadraticCurveTo(0, raging ? 11 : 23, 9, 19);
      }, null, "#547b42", 2.3);
    } else if (hurt) {
      ellipse(ctx, 0, 19, 4.5, 2.4, "#5a8244");
    } else {
      path(ctx, p => {
        p.moveTo(-8, 16); p.quadraticCurveTo(0, 23, 9, 16);
      }, null, "#547b42", 1.5);
    }
    if (type === "shield" && (details?.shieldRatio ?? 1) > 0) drawShield(ctx, details?.shieldRatio ?? 1);
    ctx.restore();
  }

  function drawPigHealth(ctx, entity) {
    const health = Math.max(0, Math.min(1, entity.hp / entity.maxHp));
    if (entity.type === "green" || !Number.isFinite(health)) return;
    const { x, y, r } = entity;
    const width = entity.type === "king" ? 78 : 48;
    const top = y - r * (entity.type === "king" ? 1.98 : 1.71) - 6;
    const left = x - width / 2;
    rounded(ctx, left, top, width, 7, 3, "#51435de6", "#423751", 1.1);
    const healthWidth = (width - 3) * health;
    if (healthWidth > 0) {
      rounded(ctx, left + 1.5, top + 1.5, healthWidth, 4, 2, entity.phase === 2 ? "#ff8775" : "#def17d");
    }
    if (entity.shieldHp > 0 && entity.shieldMaxHp > 0) {
      const shieldWidth = (width - 3) * Math.min(1, entity.shieldHp / entity.shieldMaxHp);
      rounded(ctx, left + 1.5, top + 1.5, shieldWidth, 4, 2, "#a9dff9");
    }
  }

  function drawBlock(ctx, entity) {
    const material = entity.kind === "tnt" ? "tnt" : entity.type;
    const palette = blockPalettes[material] || blockPalettes.wood;
    const { x, y, angle = 0, w, h, hp, maxHp } = entity;
    if (!w || !h) return;
    const inset = Math.min(3, w / 8, h / 8);
    const long = h > w * 1.3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const face = fade(ctx, -w / 2, -h / 2, w / 2, h / 2, [[0, palette.light], [.38, palette.base], [1, palette.shade]]);
    rounded(ctx, -w / 2, -h / 2, w, h, 5, face, palette.ink, 2.25);
    rounded(ctx, -w / 2 + inset, -h / 2 + inset, w - inset * 2, h - inset * 2, 3, null, "#fff4c477", 1.15);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-w / 2 + inset, -h / 2 + inset, w - inset * 2, h - inset * 2, Math.min(3, w / 8, h / 8));
    ctx.clip();
    if (material === "wood") {
      if (long) ctx.rotate(Math.PI / 2);
      const length = long ? h : w;
      const thickness = long ? w : h;
      ctx.globalAlpha = .34;
      path(ctx, p => {
        p.moveTo(-length / 2, -thickness * .22);
        p.bezierCurveTo(-length * .22, -thickness * .48, length * .08, -thickness * .04, length / 2, -thickness * .2);
        p.moveTo(-length / 2, thickness * .22);
        p.bezierCurveTo(-length * .04, thickness * .07, length * .17, thickness * .39, length / 2, thickness * .12);
      }, null, palette.inner, 1.25);
      ctx.globalAlpha = .52;
      for (const end of [-1, 1]) {
        ellipse(ctx, end * (length / 2 - 8), 0, 2, 2, palette.ink);
        ellipse(ctx, end * (length / 2 - 8) - .4, -.6, .75, .75, palette.light);
      }
      ctx.globalAlpha = 1;
    } else if (material === "glass") {
      const diagonal = w / 2 + h / 2;
      path(ctx, p => {
        p.moveTo(-diagonal, h / 2); p.lineTo(-diagonal + w * .25, h / 2);
        p.lineTo(w * .72, -h / 2); p.lineTo(w * .44, -h / 2); p.closePath();
      }, "#e9feff65");
      path(ctx, p => {
        p.moveTo(-w / 2 + inset * 2, h / 2 - inset * 2);
        p.lineTo(w / 2 - inset * 2, h / 2 - inset * 2);
        p.lineTo(w / 2 - inset * 2, -h / 2 + inset * 2);
      }, null, "#3676ad6e", 1.65);
    } else if (material === "stone") {
      path(ctx, p => {
        p.moveTo(-w / 2, -h / 2); p.lineTo(w * .31, -h / 2);
        p.lineTo(w * .2, -h * .28); p.lineTo(-w / 2, -h * .14); p.closePath();
      }, "#fff7ff30");
      path(ctx, p => {
        p.moveTo(w / 2, h * .04); p.lineTo(w * .26, h * .21);
        p.lineTo(-w * .13, h / 2); p.lineTo(w / 2, h / 2); p.closePath();
      }, "#413e6726");
      ellipse(ctx, -w * .24, -h * .14, 1.5, 1.25, "#5e58736b");
      ellipse(ctx, w * .22, h * .2, 1.35, 1, "#59536d68");
    } else {
      ctx.fillStyle = "#7a354547";
      ctx.fillRect(-w / 2, -h / 2 + 1, w, Math.min(h * .16, 6));
      ctx.fillRect(-w / 2, h / 2 - Math.min(h * .16, 6) - 1, w, Math.min(h * .16, 6));
      rounded(ctx, -w * .39, -h * .24, w * .78, h * .48, 2.5, "#ffe5a2", "#9d5545", 1.2);
      ctx.fillStyle = "#803c44";
      ctx.font = `900 ${Math.min(19, w * .36, h * .36)}px "Archivo Black", "Arial Black", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TNT", 0, h * .02, w * .7);
    }
    ctx.restore();

    if (hp > 0 && maxHp && hp < maxHp * .72) {
      path(ctx, p => {
        p.moveTo(w * .18, -h / 2 + inset);
        p.lineTo(-w * .13, -h * .12);
        p.lineTo(w * .06, h * .05);
        p.lineTo(-w * .25, h * .37);
        p.moveTo(w * .06, h * .05);
        p.lineTo(w * .28, h * .18);
      }, null, palette.ink, 1.35);
    }
    ctx.restore();
  }

  function paintGround(ctx, groundY, theme) {
    const warm = ["lava", "sunset", "volcano"].includes(theme);
    const soil = fade(ctx, 0, groundY, 0, WORLD_HEIGHT, warm
      ? [[0, "#e5a35d"], [.34, "#c97657"], [1, "#99526c"]]
      : [[0, "#eeb66f"], [.39, "#d58b62"], [1, "#a95e6a"]]);
    ctx.fillStyle = soil;
    ctx.fillRect(0, groundY, WORLD_WIDTH, WORLD_HEIGHT - groundY);

    path(ctx, p => {
      p.moveTo(0, groundY);
      for (let i = 0; i < WORLD_WIDTH; i += 32) {
        const depth = 15 + 5 * Math.sin(i * .037);
        p.quadraticCurveTo(i + 17, groundY + depth + 4, i + 32, groundY + depth);
      }
      p.lineTo(WORLD_WIDTH, groundY);
      p.closePath();
    }, warm ? "#e4ae55" : "#9eac49");
    ctx.fillStyle = warm ? "#f9df79" : "#d9d760";
    ctx.fillRect(0, groundY, WORLD_WIDTH, 5);
    ctx.fillStyle = "#fff0a466";
    ctx.fillRect(0, groundY, WORLD_WIDTH, 1.8);
    path(ctx, p => {
      p.moveTo(0, groundY + 55);
      p.bezierCurveTo(322, groundY + 22, 423, groundY + 77, 655, groundY + 55);
      p.bezierCurveTo(893, groundY + 34, 1031, groundY + 62, WORLD_WIDTH, groundY + 37);
      p.lineTo(WORLD_WIDTH, WORLD_HEIGHT); p.lineTo(0, WORLD_HEIGHT); p.closePath();
    }, "#ac5e6b35");

    for (let i = 0; i < 48; i += 1) {
      const x = (i * 163 + 17) % WORLD_WIDTH;
      const y = groundY + 20 + (i * 29 + 19) % (WORLD_HEIGHT - groundY - 16);
      const size = 1.5 + (i * 19 % 9) * .48;
      ellipse(ctx, x, y, size * 1.5, size * .55, i % 3 ? "#77434b28" : "#ffdc9849", null, 0, -.19);
    }
    const tufts = [17, 59, 106, 315, 360, 506, 561, 651, 1183, 1231, 1263];
    for (const x of tufts) {
      const size = 6 + (x % 9);
      path(ctx, p => {
        p.moveTo(x - 5, groundY + 3);
        p.quadraticCurveTo(x - 7, groundY - size / 2, x - 13, groundY - size / 1.6);
        p.quadraticCurveTo(x - 3, groundY - size / 1.4, x, groundY - 3);
        p.quadraticCurveTo(x, groundY - size, x + 5, groundY - size - 4);
        p.lineTo(x + 4, groundY - 2);
        p.quadraticCurveTo(x + 8, groundY - size / 1.5, x + 13, groundY - size / 2);
        p.lineTo(x + 8, groundY + 3);
        p.closePath();
      }, warm ? "#e6bd57" : "#9cae53");
    }
  }

  function drawSlingFork(ctx, x, y, front) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (!front) {
      ellipse(ctx, -4, 117, 37, 7, "#58464351");
      path(ctx, p => {
        p.moveTo(-13, 116); p.quadraticCurveTo(-12, 81, -8, 62);
        p.bezierCurveTo(-2, 47, 14, 30, 17, 15);
        p.lineTo(18, -10); p.quadraticCurveTo(26, -19, 32, -10);
        p.quadraticCurveTo(34, 18, 24, 36);
        p.quadraticCurveTo(19, 50, 7, 64);
        p.lineTo(7, 116); p.closePath();
      }, fade(ctx, -20, 10, 30, 70, [[0, "#f1ac5f"], [.46, "#c67d46"], [1, "#844437"]]), "#75413a", 3.6);
      path(ctx, p => {
        p.moveTo(23, -6); p.quadraticCurveTo(25, 15, 13, 33); p.quadraticCurveTo(7, 44, 1, 56);
      }, null, "#ffd18b91", 2.8);
      return ctx.restore();
    }
    path(ctx, p => {
      p.moveTo(-13, 116); p.quadraticCurveTo(-12, 80, -8, 66);
      p.bezierCurveTo(-17, 52, -27, 25, -30, 4);
      p.quadraticCurveTo(-33, -13, -22, -16);
      p.quadraticCurveTo(-15, -17, -12, -10);
      p.bezierCurveTo(-11, 10, -8, 25, 1, 41);
      p.quadraticCurveTo(7, 51, 7, 65);
      p.lineTo(7, 116); p.quadraticCurveTo(-3, 120, -13, 116);
      p.closePath();
    }, fade(ctx, -28, 26, 9, 30, [[0, "#f8bc76"], [.35, "#d99552"], [1, "#9d5642"]]), "#75413a", 3.5);
    path(ctx, p => {
      p.moveTo(-24, -9); p.bezierCurveTo(-27, 23, -11, 43, -8, 59);
      p.quadraticCurveTo(-10, 87, -8, 109);
      p.moveTo(-17, 15); p.quadraticCurveTo(-11, 44, -3, 56);
    }, null, "#ffd496a9", 2.2);
    ellipse(ctx, -10, 47, 3.6, 6, "#8e4f3c79", "#95584184", 1, -.45);
    for (let i = 0; i < 5; i += 1) {
      const j = 48 + i * 3.1;
      path(ctx, p => { p.moveTo(-15, j); p.quadraticCurveTo(-5, j + 5, 8, j - 1); }, null, i % 2 ? "#f9d284" : "#865a4c", 2.7);
    }
    ctx.restore();
  }

  function band(ctx, startX, startY, endX, endY, fore) {
    path(ctx, p => { p.moveTo(startX, startY); p.lineTo(endX, endY); }, null, fore ? "#623747" : "#6b4147", fore ? 7.1 : 6.5);
    path(ctx, p => { p.moveTo(startX, startY - 1.3); p.lineTo(endX, endY - 1.3); }, null, fore ? "#b67c66" : "#a77360", 2);
  }

  function drawAim(ctx, points) {
    if (!points?.length) return;
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      const alpha = Math.max(.26, 1 - i / (points.length + 4));
      ctx.globalAlpha = alpha;
      ellipse(ctx, p.x, p.y, i === 0 ? 5 : 3.6, i === 0 ? 5 : 3.6, "#fff7e1", "#b97b7aaf", 1.2);
    }
    ctx.globalAlpha = 1;
  }

  function restingShadow(ctx, entity, floor) {
    const size = entity.r || (entity.w || 0) / 2;
    const footY = entity.y + (entity.r || entity.h / 2);
    const height = floor - footY;
    if (!size || height > 115 || height < -10) return;
    ctx.globalAlpha = .18 * Math.min(1, 1.15 - height / 115);
    ellipse(ctx, entity.x + 1, floor + 2, Math.max(4, size * .97 - height / 13), 3.3, "#573943");
    ctx.globalAlpha = 1;
  }

  function drawPlatform(ctx, entity) {
    const { x, y, w, h, angle = 0 } = entity;
    if (!w || !h) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const palette = fade(ctx, 0, -h / 2, 0, h / 2, [[0, "#e6c68b"], [.3, "#b4a2a7"], [1, "#857c98"]]);
    rounded(ctx, -w / 2, -h / 2, w, h, 7, palette, "#675975", 2);
    path(ctx, p => {
      p.moveTo(-w / 2 + 7, -h / 2 + 2);
      p.lineTo(w / 2 - 7, -h / 2 + 2);
    }, null, "#eed794", 3);
    for (let index = -w / 2 + 19; index < w / 2 - 13; index += 31) {
      ellipse(ctx, index, h * .16, 2.1, 1.5, "#695a76ad");
    }
    ctx.restore();
  }

  function create(canvas, options = {}) {
    const ctx = canvas.getContext("2d");
    const reduceMotion = Boolean(options.reducedMotion);
    let particles = [];
    let waves = [];
    let trails = new Map();
    let elapsed = 0;
    let shake = 0;
    let groundArt = null;
    let width = 0;
    let height = 0;
    let needsResize = true;
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => { needsResize = true; }) : null;
    observer?.observe(canvas);
    if (!observer) window.addEventListener("resize", invalidate);
    canvas.style.touchAction = "none";

    function invalidate() { needsResize = true; }

    function sizeCanvas() {
      if (!needsResize) return;
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(box.width * ratio));
      height = Math.max(1, Math.round(box.height * ratio));
      canvas.width = width;
      canvas.height = height;
      needsResize = false;
    }

    function drawGround(groundY, theme) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (groundArt?.theme !== theme || groundArt?.y !== groundY || groundArt?.ratio !== ratio) {
        const top = groundY - 26;
        const layer = document.createElement("canvas");
        layer.width = Math.round(WORLD_WIDTH * ratio);
        layer.height = Math.round((WORLD_HEIGHT - top) * ratio);
        const groundCtx = layer.getContext("2d");
        groundCtx.setTransform(ratio, 0, 0, ratio, 0, -top * ratio);
        paintGround(groundCtx, groundY, theme);
        groundArt = { layer, top, ratio, theme, y: groundY };
      }
      ctx.drawImage(groundArt.layer, 0, groundArt.top, WORLD_WIDTH, WORLD_HEIGHT - groundArt.top);
    }

    function puff(x, y, count, colors, speed, kind = "chip") {
      for (let i = 0; i < count; i += 1) {
        const direction = Math.random() * TAU;
        const velocity = speed * (.22 + Math.random() * .82);
        const life = .31 + Math.random() * .48;
        particles.push({
          x, y, vx: Math.cos(direction) * velocity, vy: Math.sin(direction) * velocity - 35,
          color: colors[i % colors.length], life, total: life,
          size: (kind === "smoke" ? 7 : 2.1) + Math.random() * (kind === "smoke" ? 17 : 4.7),
          angle: direction, spin: (Math.random() - .5) * 12, kind,
        });
      }
      if (particles.length > 480) particles.splice(0, particles.length - 480);
    }

    function wave(x, y, radius, colors, duration = .43, blast = false) {
      waves.push({ x, y, radius, colors, life: duration, total: duration, blast });
      if (waves.length > 24) waves.shift();
    }

    function effect(event) {
      if (!event || !Number.isFinite(event.x) || !Number.isFinite(event.y)) return;
      const { x, y, type } = event;
      const colorKey = event.material || event.birdType || event.bird || event.kind || event.variant;
      const colors = fxColors[colorKey] || fxColors.tnt;
      const density = reduceMotion ? .5 : 1;
      if (type === "blast") {
        const colors = event.birdType === "black"
          ? ["#fff2b4", "#f88cf0", "#a87aff"]
          : ["#fff4ab", "#ff8f60", "#fa709c"];
        wave(x, y, Math.min(245, event.radius || 155), colors, .56, true);
        puff(x, y, Math.round(52 * density), [...fxColors.tnt, colors[2]], 390);
        puff(x, y, Math.round(12 * density), colors, 310, "star");
        puff(x, y, Math.round(13 * density), ["#ffba6c", "#f29880", "#ca7a8a"], 118, "smoke");
        if (!reduceMotion) shake = Math.min(13, shake + 8);
      } else if (type === "break") {
        puff(x, y, Math.round(15 * density), colors, 185);
      } else if (type === "guard") {
        wave(x, y, 32, ["#f6fbff", "#97bfe9"], .23);
        puff(x, y, Math.round(10 * density), ["#f9f3df", "#c6d9fa", "#8facce"], 138, "star");
      } else if (type === "armorBreak") {
        wave(x, y, 56, ["#fff0c0", "#a4cbea"], .37);
        puff(x, y, Math.round(21 * density), ["#e2f5ff", "#aebfda", "#6e7b9c"], 194);
      } else if (type === "rage") {
        const flame = ["#fff0ad", "#fa875f", "#e95882"];
        wave(x, y, event.radius || 83, flame, .53, true);
        puff(x, y, Math.round(32 * density), flame, 227, "star");
        if (!reduceMotion) shake = Math.min(13, shake + 5);
      } else if (type === "pig") {
        const king = event.pigType === "king";
        wave(x, y, king ? 86 : 42, king ? ["#ffecad", "#ffc071", "#ff8791"] : ["#eaffb0", "#9bcf60"], king ? .47 : .32);
        puff(x, y, Math.round((king ? 31 : 18) * density), king ? [...fxColors.pig, ...fxColors.tnt] : fxColors.pig, king ? 231 : 157, "star");
      } else if (type === "ability") {
        wave(x, y, 51, colors, .36);
        puff(x, y, Math.round(17 * density), colors, 183, "star");
      } else if (type === "hit") {
        puff(x, y, Math.round(6 * density), colors, 112);
        if (!reduceMotion) shake = Math.max(shake, 2.5);
      } else if (type === "launch") {
        puff(x, y, Math.round(10 * density), ["#ffe7ad", "#fae1ca", "#f6a497"], 108);
      } else if (type === "win") {
        puff(x, y, Math.round(31 * density), [...fxColors.pig, ...fxColors.tnt, ...fxColors.blue], 230, "star");
      }
    }

    function paintEffects(dt, front) {
      for (const ring of waves) {
        const progress = 1 - ring.life / ring.total;
        const radius = ring.radius * (1 - (1 - progress) ** 2.5);
        if (radius < .1) continue;
        ctx.globalAlpha = Math.min(1, 1 - progress) ** (front ? 1.5 : 2);
        if (front) {
          ellipse(ctx, ring.x, ring.y, radius, radius, null, ring.colors[1] || ring.colors[0], Math.max(1, 4 - 3 * progress));
          ellipse(ctx, ring.x, ring.y, radius * .76, radius * .76, null, ring.colors[0], Math.max(1, 3 - 2 * progress));
          if (ring.blast && !reduceMotion) {
            const tickRadius = radius * 1.13;
            ctx.lineCap = "round";
            path(ctx, p => {
              for (let i = 0; i < 15; i += 1) {
                const angle = i * TAU / 15 + .32;
                const x = Math.cos(angle);
                const y = Math.sin(angle);
                const start = tickRadius * (.81 + i % 3 * .04);
                p.moveTo(ring.x + x * start, ring.y + y * start);
                p.lineTo(ring.x + x * tickRadius, ring.y + y * tickRadius);
              }
            }, null, ring.colors[2], Math.max(.6, 2.8 - 2 * progress));
          }
        } else {
          const glow = ctx.createRadialGradient(ring.x, ring.y, 0, ring.x, ring.y, radius);
          glow.addColorStop(0, ring.blast ? "#fff9d5f2" : "#fff9b8af");
          glow.addColorStop(.34, ring.blast ? "#ffba80aa" : "#ffbf7565");
          glow.addColorStop(.63, ring.blast ? ring.colors[2] + "64" : "#ffdba130");
          glow.addColorStop(1, "#ffdba100");
          ellipse(ctx, ring.x, ring.y, radius, radius, glow);
        }
      }

      for (const particle of particles) {
        if ((particle.kind !== "smoke") !== front) continue;
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += (particle.kind === "smoke" ? -40 : 315) * dt;
        particle.angle += particle.spin * dt;
        const life = Math.max(0, particle.life / particle.total);
        ctx.globalAlpha = life * (particle.kind === "smoke" ? .46 : .94);
        const size = particle.size * (particle.kind === "smoke" ? 2 - life : .5 + life * .5);
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.angle);
        if (particle.kind === "smoke") {
          ellipse(ctx, 0, 0, size, size * .8, particle.color);
        } else if (particle.kind === "star") {
          path(ctx, p => {
            p.moveTo(0, -size);
            p.lineTo(size * .27, -size * .25);
            p.lineTo(size, 0);
            p.lineTo(size * .27, size * .25);
            p.lineTo(0, size); p.lineTo(-size * .27, size * .25);
            p.lineTo(-size, 0); p.lineTo(-size * .27, -size * .25); p.closePath();
          }, particle.color);
        } else {
          path(ctx, p => { p.moveTo(-size, 0); p.lineTo(0, -size * .7); p.lineTo(size, size * .3); p.closePath(); }, particle.color);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (front) {
        particles = particles.filter(p => p.life > 0);
        for (const ring of waves) ring.life -= dt;
        waves = waves.filter(w => w.life > 0);
      }
    }

    function paintTrails(entities, dt) {
      const active = new Set();
      for (const entity of entities) {
        if (entity.kind !== "bird") continue;
        active.add(entity.id);
        const speed = Math.hypot(entity.vx || 0, entity.vy || 0);
        if (speed < 3.8) continue;
        const trail = trails.get(entity.id) || [];
        const last = trail.at(-1);
        if (!last || Math.hypot(last.x - entity.x, last.y - entity.y) > 9) {
          trail.push({ x: entity.x, y: entity.y, r: (entity.r || 25) * .5, life: .22 });
          if (trail.length > 17) trail.shift();
        }
        trails.set(entity.id, trail);
      }
      for (const [id, trail] of trails) {
        for (const p of trail) {
          p.life -= dt;
          if (p.life <= 0) continue;
          const remaining = p.life / .22;
          ctx.globalAlpha = remaining * .55;
          ellipse(ctx, p.x, p.y, p.r * remaining, p.r * remaining, "#fff5d2");
        }
        const alive = trail.filter(p => p.life > 0);
        if (alive.length || active.has(id)) trails.set(id, alive);
        else trails.delete(id);
      }
      ctx.globalAlpha = 1;
    }

    function reset() {
      particles = [];
      waves = [];
      trails.clear();
      shake = 0;
    }

    function draw(state, deltaMs = 16.67) {
      if (!state || !ctx) return;
      sizeCanvas();
      const dt = Math.max(0, Math.min(40, deltaMs || 0)) / 1000;
      elapsed += dt;
      ctx.setTransform(width / WORLD_WIDTH, 0, 0, height / WORLD_HEIGHT, 0, 0);
      ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      const world = window.BirdGame?.world;
      const ground = world?.groundY || 505;
      const sling = state.sling || world?.sling || { x: 206, y: 388 };
      const entities = state.entities || [];
      const loaded = (state.status === "ready" || state.status === "aiming") && (state.activeBirdType || state.ammo?.[0]);
      const pouch = state.aim || { x: sling.x, y: sling.y };
      const flick = state.aim || reduceMotion ? 0 : Math.sin(elapsed * 3.3) * 1.4;
      const groundTheme = state.level?.theme;

      drawGround(ground, groundTheme);
      ctx.save();
      if (shake > .2) {
        ctx.translate(Math.sin(elapsed * 92) * shake * .38, Math.cos(elapsed * 77) * shake * .34);
        shake *= Math.pow(.055, dt);
      }
      for (const entity of entities) restingShadow(ctx, entity, ground);
      drawAim(ctx, state.trajectory);
      paintTrails(entities, dt);
      paintEffects(dt, false);

      for (const entity of entities) {
        if (entity.kind === "platform") drawPlatform(ctx, entity);
      }
      for (const entity of entities) {
        if (entity.kind === "block" || entity.kind === "tnt") drawBlock(ctx, entity);
      }
      for (const entity of entities) {
        const { x, y, type, r, angle, id } = entity;
        if (entity.kind === "pig") {
          const healthRatio = entity.hp / entity.maxHp;
          const shieldRatio = entity.shieldMaxHp > 0 ? entity.shieldHp / entity.shieldMaxHp : undefined;
          const blink = (elapsed + (Number(id) || 0) * .73) % 5.3 > 5.16;
          drawPig(ctx, x, y, r, angle, healthRatio < .56, blink, type, {
            healthRatio,
            shieldRatio,
            phase: entity.phase,
            finalKing: state.levelIndex === 29,
          });
        }
        if (entity.kind === "bird") drawBird(ctx, type, x, y, r, angle);
      }

      drawSlingFork(ctx, sling.x, sling.y, false);
      band(ctx, sling.x + 25, sling.y - 6, pouch.x + 6, pouch.y + (loaded ? 7 : 3), false);
      if (loaded) {
        const radius = window.BirdGame?.birds?.[loaded]?.radius || window.BirdGame?.birds?.[loaded]?.r || 29;
        const aimAngle = state.aim ? Math.min(.38, Math.max(-.38, Math.atan2(sling.y - pouch.y, sling.x - pouch.x) * .45)) : 0;
        drawBird(ctx, loaded, pouch.x, pouch.y - 3 + flick, radius * 1.13, aimAngle, !state.aim && elapsed % 4.9 > 4.78);
      }
      drawSlingFork(ctx, sling.x, sling.y, true);
      band(ctx, sling.x - 22, sling.y - 7, pouch.x - (loaded ? 16 : 0), pouch.y + (loaded ? 9 : 3), true);
      if (!loaded) {
        band(ctx, pouch.x, pouch.y + 3, sling.x + 25, sling.y - 6, true);
      }
      paintEffects(dt, true);
      for (const entity of entities) {
        if (entity.kind === "pig") drawPigHealth(ctx, entity);
      }
      ctx.restore();
    }

    return {
      draw, effect, reset, invalidate,
      dispose() {
        observer?.disconnect();
        if (!observer) window.removeEventListener("resize", invalidate);
      },
    };
  }

  window.BirdRenderer = { create, drawBird, drawPig };
})();
