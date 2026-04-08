package org.example.qinglang.controller;

import org.example.qinglang.entity.UserEntity;
import org.example.qinglang.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.util.StringUtils;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;



    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserEntity user) {
        // 1. 非空检查
        if (!StringUtils.hasText(user.getUsername()) || !StringUtils.hasText(user.getEmail())) {
            return ResponseEntity.badRequest().body("关键信息不能为空");
        }

        // 2. 邮箱格式后端验证
        String emailRegex = "^[A-Za-z0-9+_.-]+@(.+)$";
        if (!Pattern.compile(emailRegex).matcher(user.getEmail()).matches()) {
            return ResponseEntity.badRequest().body("邮箱格式非法");
        }

        // 3. 手机号后端验证 (11位数字)
        String phoneRegex = "^1[3-9]\\d{9}$";
        if (!Pattern.compile(phoneRegex).matcher(user.getPhone()).matches()) {
            return ResponseEntity.badRequest().body("手机号格式不正确");
        }

        // 4. 唯一性检查
        if (userRepository.existsByUsername(user.getUsername())) {
            return ResponseEntity.badRequest().body("用户名已被占用");
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().body("该邮箱已注册");
        }

        userRepository.save(user);
        return ResponseEntity.ok("注册成功");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam String identifier, @RequestParam String password) {
        // 后端非空校验
        if (!StringUtils.hasText(identifier) || !StringUtils.hasText(password)) {
            return ResponseEntity.badRequest().body("账号或密码不能为空");
        }

        return userRepository.findByUsernameOrEmailOrPhone(identifier, identifier, identifier)
                .map(user -> {
                    if (user.getPassword().equals(password)) {
                        return ResponseEntity.ok("登录成功，欢迎 " + user.getUsername());
                    }
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("密码错误");
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body("用户不存在"));
    }

}