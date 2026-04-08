package org.example.qinglang.repository;

import org.example.qinglang.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Integer> {
    // 根据 用户名 OR 邮箱 OR 手机号 查找用户
    Optional<UserEntity> findByUsernameOrEmailOrPhone(String username, String email, String phone);

    // 注册时校验是否已存在
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
}