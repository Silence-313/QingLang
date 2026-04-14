package org.example.qinglang.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.example.qinglang.entity.UserEntity;
import org.example.qinglang.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
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
    public ResponseEntity<Map<String, Object>> login(@RequestParam String identifier,
                                                     @RequestParam String password,
                                                     HttpServletRequest request) {
        // 后端非空校验
        if (!StringUtils.hasText(identifier) || !StringUtils.hasText(password)) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "账号或密码不能为空");
            return ResponseEntity.badRequest().body(error);
        }

        return userRepository.findByUsernameOrEmailOrPhone(identifier, identifier, identifier)
                .map(user -> {
                    if (user.getPassword().equals(password)) {
                        // 登录成功：将 userId 存入 session
                        HttpSession session = request.getSession();
                        session.setAttribute("userId", user.getUserId());

                        // 返回成功的响应（可附带用户基本信息）
                        Map<String, Object> response = new HashMap<>();
                        response.put("message", "登录成功，欢迎 " + user.getUsername());
                        response.put("userId", user.getUserId());
                        response.put("username", user.getUsername());
                        return ResponseEntity.ok(response);
                    }
                    // 密码错误时也返回 Map
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "密码错误");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
                })
                .orElseGet(() -> {
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "用户不存在");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
                });
    }

    /**
     * 获取当前登录用户信息
     */
    @GetMapping("/current-user")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        Integer userId = (Integer) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "未登录"));
        }

        return userRepository.findById(userId)
                .map(user -> {
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("userId", user.getUserId());
                    userInfo.put("username", user.getUsername());
                    userInfo.put("email", user.getEmail());
                    userInfo.put("realName", user.getRealName());
                    userInfo.put("role", user.getRole());
                    return ResponseEntity.ok(userInfo);
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "用户不存在")));
    }

    /**
     * 退出登录
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("message", "已退出登录"));
    }
}