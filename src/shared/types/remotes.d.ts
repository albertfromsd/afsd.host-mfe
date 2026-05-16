declare module 'remoteTemplate/App' {
  const RemoteApp: React.ComponentType;
  export default RemoteApp;
}

declare module 'hostTemplate/stores/session' {
  export * from '@/stores/session';
}
