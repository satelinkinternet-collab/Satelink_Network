-- LAYER-5.5: Atomic op increment (UPSERT)
-- Safe to run anytime (this file just documents the query)

-- Usage parameters:
-- :epoch_id, :user_wallet, :op_type, :delta_ops, :weight, :created_at

INSERT INTO op_counts (epoch_id, user_wallet, op_type, ops, weight, created_at)
VALUES (:epoch_id, :user_wallet, :op_type, :delta_ops, :weight, :created_at)
ON CONFLICT(epoch_id, user_wallet, op_type)
DO UPDATE SET
  ops = op_counts.ops + excluded.ops,
  weight = excluded.weight;

