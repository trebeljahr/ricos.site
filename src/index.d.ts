declare module "*.vert" {
  const content: string;
  export default content;
}

declare module "*.frag" {
  const content: string;
  export default content;
}

declare module "*.glsl" {
  const content: string;
  export default content;
}

declare module "fast-2d-poisson-disk-sampling";

declare module "joystick-controller" {
  // Add custom types here or leave it empty if the types are not necessary
  const joystickController: any;
  export default joystickController;
}
