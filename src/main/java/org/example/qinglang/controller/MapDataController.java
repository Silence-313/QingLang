package org.example.qinglang.controller;

import org.example.qinglang.entity.ProvinceStatEntity;
import org.example.qinglang.repository.ProvinceStatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/map")
@CrossOrigin // 允许跨域请求
public class MapDataController {

    @Autowired
    private ProvinceStatRepository repository;

    @GetMapping("/stats")
    public List<ProvinceStatEntity> getProvinceStats() {
        return repository.findAll();
    }
}