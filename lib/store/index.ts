// CallKit 不再创建独立的 Pinia 实例
// 使用应用层提供的 Pinia 实例
// 各个 store 通过 getActivePinia() 获取当前活动的 Pinia 实例