// The world-atlas package ships plain TopoJSON without types; the globe casts it to a Topology.
declare module "world-atlas/countries-110m.json" {
  const topology: unknown

  export default topology
}
