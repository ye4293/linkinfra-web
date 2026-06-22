export enum Role {
  RoleUser = 1, // 普通用户
  RoleAdmin = 10, // 管理员
  RoleRoot = 100 // 超级管理员
}

export const RoleValue = {
  [Role.RoleUser]: 'user',
  [Role.RoleAdmin]: 'admin',
  [Role.RoleRoot]: 'root'
};

export const RoleValueText = {
  [Role.RoleUser]: 'User',
  [Role.RoleAdmin]: 'Admin',
  [Role.RoleRoot]: 'Super admin'
};
