import { withContentlayer } from "next-contentlayer";

const nextConfig = {
  images: {
    domains: [process.env.NEXT_PUBLIC_STATIC_FILE_URL],
    loader: "custom",
    loaderFile: "./image-loader.js",
  },
  redirects: customRedirects,
  webpack: (config) => {
    config.infrastructureLogging = {
      level: "error",
    };

    return config;
  },
};

const configWithContentlayer = withContentlayer(nextConfig);

export default configWithContentlayer;

async function customRedirects() {
  return [
    {
      source: "/newsletters/30",
      destination:
        "/newsletters/ai-video-generation-chipnemo-and-real-time-image-generation",
      permanent: true,
    },
    {
      source: "/newsletters/29",
      destination:
        "/newsletters/openai-dev-day-github-universe-and-sam-altman-leaving-openai",
      permanent: true,
    },
    {
      source: "/newsletters/28",
      destination:
        "/newsletters/talking-robots-futurehouse-and-the-role-of-computation-&-ai-in-biotech",
      permanent: true,
    },
    {
      source: "/newsletters/27",
      destination:
        "/newsletters/adobe-max-the-techno-optimist-manifesto-and-nvidia's-eureka",
      permanent: true,
    },
    {
      source: "/newsletters/26",
      destination:
        "/newsletters/metaverse-interviews-gpt-improvements-and-meta-connect",
      permanent: true,
    },
    {
      source: "/newsletters/25",
      destination:
        "/newsletters/dall·e-3-alphamissense-and-improvements-to-google-bard",
      permanent: true,
    },
    {
      source: "/newsletters/24",
      destination:
        "/newsletters/fury-ai-drones-asml-manufacturing-and-seamless-translation",
      permanent: true,
    },
    {
      source: "/newsletters/23",
      destination:
        "/newsletters/brain2music-biosecurity-risks-and-flywire-a-connectome-of-a-fruit-fly-brain",
      permanent: true,
    },
    {
      source: "/newsletters/22",
      destination:
        "/newsletters/room-temperature-superconductors-llama2-and-single-photon-cameras",
      permanent: true,
    },
    {
      source: "/newsletters/21",
      destination:
        "/newsletters/the-ai-dilemma-robocat-and-how-to-do-great-work",
      permanent: true,
    },
    {
      source: "/newsletters/20",
      destination:
        "/newsletters/joi-chemcrow-and-the-economic-potential-of-generative-ai",
      permanent: true,
    },
    {
      source: "/newsletters/19",
      destination: "/newsletters/nvidia-keynote-musiclm-and-apple's-vision-pro",
      permanent: true,
    },
    {
      source: "/newsletters/18",
      destination:
        "/newsletters/mind-reading-senatorial-hearings-and-ai-image-editing",
      permanent: true,
    },
    {
      source: "/newsletters/17",
      destination: "/newsletters/100k-token-contexts-ai-tutors-and-google-io",
      permanent: true,
    },
    {
      source: "/newsletters/16",
      destination:
        "/newsletters/software²-superabundant-intelligence-and-minigpt",
      permanent: true,
    },
    {
      source: "/newsletters/15",
      destination:
        "/newsletters/planning-for-agi-code-that-fixes-itself-and-sam",
      permanent: true,
    },
    {
      source: "/newsletters/14",
      destination: "/newsletters/gpt-plugins-signs-of-agi-and-an-open-letter",
      permanent: true,
    },
    {
      source: "/newsletters/13",
      destination:
        "/newsletters/computational-languages-gpt-4-and-midjourney-v5",
      permanent: true,
    },
    {
      source: "/newsletters/12",
      destination:
        "/newsletters/ai-video-animation-sidney-and-why-coding-won’t-exist-anymore",
      permanent: true,
    },
    {
      source: "/newsletters/11",
      destination:
        "/newsletters/blurry-jpgs-the-meaning-crisis-and-spectrograms",
      permanent: true,
    },
    {
      source: "/newsletters/10",
      destination:
        "/newsletters/zeroth-principle-thinking-simulators-and-joscha-bach",
      permanent: true,
    },
    {
      source: "/newsletters/9",
      destination: "/newsletters/biotechnology-democratizing-ai-and-spinoza",
      permanent: true,
    },
    {
      source: "/newsletters/8",
      destination: "/newsletters/computational-selves-mindvis-and-ai-takeoff",
      permanent: true,
    },
    {
      source: "/newsletters/7",
      destination:
        "/newsletters/3d-in-the-browser-neurons-in-a-petri-dish-and-the-beauty-of-splines",
      permanent: true,
    },
    {
      source: "/newsletters/6",
      destination:
        "/newsletters/chatgpt-neuralink-and-advice-against-procrastination",
      permanent: true,
    },
    {
      source: "/newsletters/5",
      destination: "/newsletters/richard-feynman-ambition-and-how-sound-works",
      permanent: true,
    },
    {
      source: "/newsletters/4",
      destination: "/newsletters/collision-detection-synthetic-biology-and-ai",
      permanent: true,
    },
    {
      source: "/newsletters/3",
      destination: "/newsletters/creativity-alphatensor-and-motivation",
      permanent: true,
    },
    {
      source: "/newsletters/2",
      destination: "/newsletters/clippy-resetting-the-loop-and-complexity",
      permanent: true,
    },
    {
      source: "/newsletters/1",
      destination: "/newsletters/sketchplanations-ai-and-armageddon",
      permanent: true,
    },
    {
      source: "/newsletter/:id*",
      destination: "/newsletters/:id*",
      permanent: true,
    },
  ];
}
