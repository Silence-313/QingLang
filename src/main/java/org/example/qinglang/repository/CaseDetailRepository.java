package org.example.qinglang.repository;

import org.example.qinglang.entity.CaseDetailEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CaseDetailRepository extends JpaRepository<CaseDetailEntity, Integer> {
    // 因为 case_id 是唯一的，我们通过它来查询详情
    Optional<CaseDetailEntity> findByCaseId(Integer caseId);
}