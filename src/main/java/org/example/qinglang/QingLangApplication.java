package org.example.qinglang;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
// 告诉 JPA 只扫描 Repository 包
@EnableJpaRepositories(basePackages = "org.example.qinglang.repository")
// 告诉 MyBatis Plus 只扫描 Mapper 包
@MapperScan("org.example.qinglang.mapper")
public class QingLangApplication {

    public static void main(String[] args) {
        SpringApplication.run(QingLangApplication.class, args);
    }

}
