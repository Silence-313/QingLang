package org.example.qinglang.repository;

import org.example.qinglang.entity.ProvinceStatEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProvinceStatRepository extends JpaRepository<ProvinceStatEntity, String> {
    // 视图中 province_name 是唯一的，可以直接查全量数据
    @Query(value = "SELECT * FROM province_stats", nativeQuery = true)
    List<ProvinceStatEntity> findAllDynamicStats();
}