package org.example.qinglang.repository;

import org.apache.ibatis.annotations.Param;
import org.example.qinglang.entity.LegalSupervisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LegalSupervisionRepository extends JpaRepository<LegalSupervisionEntity, Integer> {
    Optional<LegalSupervisionEntity> findByCaseId(Integer caseId);

    @Query("SELECT COUNT(s) FROM LegalSupervisionEntity s WHERE s.caseId IN :caseIds")
    Long countByCaseIdIn(@Param("caseIds") List<Integer> caseIds);


}