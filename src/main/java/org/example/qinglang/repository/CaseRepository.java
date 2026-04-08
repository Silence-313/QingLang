package org.example.qinglang.repository;

import org.example.qinglang.entity.CaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CaseRepository extends JpaRepository<CaseEntity, Integer> {
    // 根据案件编号查询，这在处理 Python 导入的数据时非常有用
    Optional<CaseEntity> findByCaseNumber(String caseNumber);
}