package org.example.qinglang.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController {

    @GetMapping("/")
    public String index() {
        // Spring Boot 会自动在 templates 目录下寻找名为 index.html 的文件
        // 注意：这里返回的是文件名，不需要加 .html 后缀
        return "index";
    }

    // 访问 localhost:8080/main 时展示 main.html
    @GetMapping("/main")
    public String mainPage() {
        return "main"; // 对应 templates/main.html
    }

    // 访问 localhost:8080/search-results 展示结果页面
    @GetMapping("/search-results")
    public String searchResultsPage() {
        return "search"; // 对应 templates/search.html
    }
}