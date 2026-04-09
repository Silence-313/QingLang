package org.example.qinglang;

import org.example.qinglang.entity.CaseEsEntity;
import org.example.qinglang.repository.CaseEsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Optional;

@SpringBootTest
class EsTest {

    @Autowired
    private CaseEsRepository caseEsRepository;

    @Test
    void testSave() {
        CaseEsEntity entity = new CaseEsEntity();
        entity.setId(1L);
        entity.setContent("这是一个关于青朗法治项目的测试数据");

        // 保存到 ES
        caseEsRepository.save(entity);

        // 从 ES 查询
        Optional<CaseEsEntity> result = caseEsRepository.findById(1L);
        System.out.println("查询结果：" + result.get());

        assert result.isPresent();
    }
}