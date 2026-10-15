-- ActualQuantity can come from orders or an external quantity source.
-- It must not be presented as proof that goods have been delivered.
alter view delivery_gaps rename to commitment_gaps;
