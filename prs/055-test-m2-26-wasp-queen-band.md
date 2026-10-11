# PR 055: test/m2-26-wasp-queen-band

Follow-up to PR 044: the wasp-queen-nest casual-bot test band was 50–70%. It's now design's **55 ± 5**, which is 50–60% (validation-m2.md, boss row). Base: main `2b40775`.

## Measured

Casual bot, 200 seeds, on main: **59.5%**. That's inside the band, with no test fudging, but only 0.5 pp below the upper limit. Any small sim or bot change that adds a single win puts it at 60.0%, still inside. Two more wins (60.5%) fail the test.

Thistle-gauntlet stays at 60–75% (measured 65%).

Note for design: the 59.5% they reported equals the measurement, but their target is 55%. If they want the boss centred on 55%, wasp-queen needs a small extra retune, for example a slightly higher nestHp. This PR doesn't change any level data.

## Checks

lint ok · tests pass · build ok · size budget unchanged (test-only change).
