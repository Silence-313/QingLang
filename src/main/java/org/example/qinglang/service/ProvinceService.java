package org.example.qinglang.service;

import org.example.qinglang.entity.ProvinceStatEntity;
import org.example.qinglang.repository.ProvinceStatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProvinceService {
    @Autowired
    private ProvinceStatRepository repository;

    public List<ProvinceStatEntity> getMapData() {
        // 由于是视图，此处 findAll 会触发 SQL 实时计算最新的 cases 和 legal_supervision 数据
        return repository.findAll();
    }
}
