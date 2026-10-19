function findHit() {
    return planets.find(p =>
      Math.hypot(ship.x - p.x, ship.y - p.y) <= p.r + ship.r
    );
  }

  function hitTest(p = null) {
    if (!p) return false;

    // Remove only the planet that was hit.
    planets = planets.filter(planet => planet !== p);

    // Award exactly one badge for this planet.
    badges++;
    badgeCount.textContent = `${badges} ⭐`;

    addBurst(p.x, p.y, 42, true);
    playExplosion();
    playCelebration();
    statusText.textContent = "Planet collected!";
    say(`Planet collected! +1 badge! Total: ${badges}`);

    // Never reset or remove the rocket here.
    return true;
  }

  function update(t) {
    if (animation) {
      if (animation.phase === "spin") {
        const p = Math.min(1, (t - animation.at) / animation.duration);
        const e = 1 - Math.pow(1 - p, 3);

        ship.angle = animation.a0 + (animation.a1 - animation.a0) * e;

        if (t - lastTrail > 25) {
          addTrail();
          lastTrail = t;
        }

        if (p >= 1) {
          animation = null;
          statusText.textContent = "Spin complete. Press B to move!";
        }
      } else if (animation.phase === "move") {
        const moveAnimation = animation;
        const p = Math.min(
          1,
          (t - moveAnimation.at) / moveAnimation.duration
        );
        const e = 1 - Math.pow(1 - p, 2);

        // Move the rocket. The screen edges wrap around.
        ship.x = wrap(
          moveAnimation.x0 +
          (moveAnimation.x1 - moveAnimation.x0) * e,
          W
        );
        ship.y = wrap(
          moveAnimation.y0 +
          (moveAnimation.y1 - moveAnimation.y0) * e,
          H
        );

        if (t - lastTrail > 18) {
          addTrail();
          lastTrail = t;
        }

        // Check every planet, including small planets.
        // Sample the path between the previous and current positions
        // to reduce the chance of passing through a planet unnoticed.
        const samples = 8;
        for (let i = 0; i <= samples; i++) {
          const q = i / samples;
          const x = wrap(
            moveAnimation.x0 +
            (moveAnimation.x1 - moveAnimation.x0) * q,
            W
          );
          const y = wrap(
            moveAnimation.y0 +
            (moveAnimation.y1 - moveAnimation.y0) * q,
            H
          );

          const hit = planets.find(planet =>
            Math.hypot(x - planet.x, y - planet.y) <=
            planet.r + ship.r
          );

          if (hit) {
            hitTest(hit);
            // Continue the flight; do not hide the rocket.
          }
        }

        if (p >= 1) {
          animation = null;
          statusText.textContent = "Flight complete! Press B to fly again.";
        }
      }
    }

    trail = trail.filter(p => p.life > 0);
    for (const p of trail) {
      p.life--;
      p.size *= 1.005;
    }

    particles = particles.filter(p => p.life > 0);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life--;
    }
  }
