export function switchedModeArgs(args, currentlyDemo) {
  return [...args.filter(a => a !== '--demo' && a !== '--record-network'), ...(!currentlyDemo ? ['--demo'] : [])];
}
