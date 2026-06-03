declare module 'remoteTemplate/App' {
  const RemoteApp: React.ComponentType;
  export default RemoteApp;
}

declare module 'hostTemplate/stores/store' {
  export * from '@/shared/stores/store';
}

declare module 'hostTemplate/lib/eventBus' {
  export * from '@/shared/lib/eventBus';
}
