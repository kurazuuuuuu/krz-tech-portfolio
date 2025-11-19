<template>
  <div id="tsparticles-container">
    <vue-particles
      id="tsparticles"
      :options="options"
    />
  </div>
</template>

<script>
export default {
  name: 'ParticlesBackground',
  data() {
    return {
      options: {
        fullScreen: {
          enable: false
        },
        background: {
          color: {
            value: "transparent"
          }
        },
        fpsLimit: 120,
        interactivity: {
          events: {
            onClick: {
              enable: false,
              mode: "push"
            },
            onHover: {
              enable: true,
              mode: "grab"
            },
            resize: true
          },
          modes: {
            bubble: {
              distance: 400,
              duration: 2,
              opacity: 0.8,
              size: 40
            },
            push: {
              quantity: 4
            },
            grab: {
              distance: 140,
              links: {
                opacity: 1
              }
            }
          }
        },
        particles: {
          color: {
            value: ["#7db87d", "#a8e6a3", "#6ba86b"]
          },
          links: {
            color: "#7db87d",
            distance: 150,
            enable: true,
            opacity: 0.8,
            width: 2
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "out"
            },
            random: true,
            speed: 1,
            straight: false
          },
          number: {
            density: {
              enable: true,
              area: 800
            },
            value: 33
          },
          opacity: {
            value: 0.5,
            random: true,
            anim: {
              enable: true,
              speed: 0.5,
              opacity_min: 0.1,
              sync: false
            }
          },
          shape: {
            type: ["triangle", "edge", "polygon"], // edge renders as square
            options: {
              polygon: [
                {
                  sides: 5
                },
                {
                  sides: 6
                }
              ]
            }
          },
          size: {
            value: { min: 3.6, max: 9.6 },
            random: true,
            anim: {
              enable: true,
              speed: 2,
              size_min: 0.1,
              sync: false
            }
          },
          rotate: {
            value: 0,
            random: true,
            direction: "random",
            animation: {
              enable: true,
              speed: 5,
              sync: false
            }
          }
        },
        detectRetina: true
      }
    }
  }
}
</script>

<style scoped>
#tsparticles-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
</style>
