package org.example.qinglang.repository;

import org.example.qinglang.entity.LegalSupervisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LegalSupervisionRepository extends JpaRepository<LegalSupervisionEntity, Integer> {
    Optional<LegalSupervisionEntity> findByCaseId(Integer caseId);
}