// 名称和服务端超级权限必须同时满足，房主身份不授予诊断权限。
export const canRecordPerformance=account=>account?.name==='yxt'&&account?.isSuperAdmin===true;
