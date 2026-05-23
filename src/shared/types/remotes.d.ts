declare module 'remoteTemplate/App' {
  const RemoteApp: React.ComponentType;
  export default RemoteApp;
}

declare module 'hostTemplate/stores/store' {
  export * from '@/shared/stores/store';
}
