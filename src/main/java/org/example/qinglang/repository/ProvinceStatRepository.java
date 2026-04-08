package org.example.qinglang.repository;

import org.example.qinglang.entity.ProvinceStatEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProvinceStatRepository extends JpaRepository<ProvinceStatEntity, Integer> {
    // 继承 JpaRepository 后，会自动拥有 findAll(), save() 等基础数据库操作方法
}