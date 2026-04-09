package org.example.qinglang.service;

import org.example.qinglang.entity.CaseEntity;
import org.example.qinglang.entity.CaseEsEntity;
import org.example.qinglang.mapper.CaseMapper;
import org.example.qinglang.repository.CaseEsRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DataSyncService {
    @Autowired
    private CaseMapper caseMapper; // 你的 MyBatis Mapper
    @Autowired
    private CaseEsRepository caseEsRepository;

    public void syncAll() {
        // 1. 从 MySQL 查出所有数据
        List<CaseEntity> mysqlData = caseMapper.selectList(null);

        // 2. 转换为 ES 实体并保存
        List<CaseEsEntity> esData = mysqlData.stream().map(item -> {
            CaseEsEntity es = new CaseEsEntity();
            BeanUtils.copyProperties(item, es);
            return es;
        }).collect(Collectors.toList());

        caseEsRepository.saveAll(esData);
    }
}